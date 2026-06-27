package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"time"
)

//go:embed web/dist
var webAssets embed.FS

const (
	AppName    = "omnireader"
	AppVersion = "2.0.0"
)

var (
	port     = flag.Int("port", 0, "Run as HTTP server on port (0 = random free port)")
	headless = flag.Bool("headless", false, "Run without GUI")
	openFile = flag.String("open", "", "Open file on startup")
	version  = flag.Bool("version", false, "Print version and exit")
	help     = flag.Bool("help", false, "Show help")
)

func main() {
	flag.Parse()

	if *version {
		fmt.Printf("%s v%s (%s/%s)\n", AppName, AppVersion, runtime.GOOS, runtime.GOARCH)
		return
	}

	if flag.Lookup("help") != nil && (os.Args[1] == "-help" || os.Args[1] == "--help" || os.Args[1] == "-h") {
		printHelp()
		return
	}

	if flag.Lookup("help") != nil && len(os.Args) > 1 && (os.Args[1] == "-help" || os.Args[1] == "--help" || os.Args[1] == "-h") {
		printHelp()
		return
	}

	// Check for help flag manually
	for _, arg := range os.Args[1:] {
		if arg == "-help" || arg == "--help" || arg == "-h" {
			printHelp()
			return
		}
	}

	// Run HTTP server
	runHTTPServer(*port)
}

func printHelp() {
	fmt.Printf(`OmniReader v2.0.0 - Universal Document Reader

Usage:
  omnireader [flags]

Flags:
  -version          Print version and exit
  -help             Show this help
  -port int         Run as HTTP server on port (0 = random free port)
  -headless         Run without GUI (for automation)

Examples:
  omnireader                    # Run native (starts HTTP server + opens browser)
  omnireader -port 8080         # Run as web server on port 8080
  omnireader -headless -port 0  # Headless server on random port

Environment:
  OMNIREADER_CONFIG_DIR    Config directory override
  OMNIREADER_PORT          Default server port

`)
}

func runHTTPServer(port int) {
	// Embedded web assets
	fsys, err := fs.Sub(webAssets, "web/dist")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create sub FS: %v\n", err)
		os.Exit(1)
	}

	mux := http.NewServeMux()
	mux.Handle("/", http.FileServer(http.FS(fsys)))

	// API endpoints for native features
	mux.HandleFunc("/api/open", handleOpenFile)
	mux.HandleFunc("/api/save", handleSaveFile)
	mux.HandleFunc("/api/config", handleConfig)

	// Find free port if 0
	if port == 0 {
		listener, err := net.Listen("tcp", ":0")
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to find free port: %v\n", err)
			os.Exit(1)
		}
		port = listener.Addr().(*net.TCPAddr).Port
		listener.Close()
	}

	url := fmt.Sprintf("http://localhost:%d", port)

	fmt.Printf("OmniReader v2.0.0 starting on %s\n", url)
	fmt.Printf("Press Ctrl+C to stop\n")

		// Open browser
		go func() {
			time.Sleep(500 * time.Millisecond)
			openBrowser(url)
		}()

		if err := http.ListenAndServe(fmt.Sprintf(":%d", port), nil); err != nil && err != http.ErrServerClosed {
		fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
		os.Exit(1)
	}
}

func handleOpenFile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}

func handleSaveFile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}

func handleConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	cmd.Run()
}