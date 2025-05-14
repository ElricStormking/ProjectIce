#!/usr/bin/env python3
"""
Simple HTTP Server for single player game
Handles CORS issues by serving files through a local server

Usage:
    - Run this script: python serve.py
    - Open http://localhost:8000 in your browser
"""

import http.server
import socketserver
import os
import webbrowser
from urllib.parse import urlparse

PORT = 8000

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow all origins
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super().end_headers()
    
    def do_GET(self):
        # Serve index.html for all paths except those referring to files
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # If it's a file with extension, serve it directly
        if '.' in os.path.basename(path) and not path.endswith('.html'):
            return super().do_GET()
        
        # For everything else, serve index.html
        if path == '/' or not os.path.exists(path[1:]):
            self.path = '/index.html'
        
        return super().do_GET()

Handler = CORSRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving game at http://localhost:{PORT}")
    print("Open this URL in your browser to play without CORS issues")
    
    # Try to open the browser automatically
    try:
        webbrowser.open(f"http://localhost:{PORT}")
    except:
        pass
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.") 