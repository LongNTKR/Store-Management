"""
Store Management System - Main Entry Point

A modern web application for managing product sales, inventory,
and customer relationships with AI-powered features.

Uses Streamlit for beautiful, responsive UI.

Author: Claude
Version: 1.0.0
"""

import sys
import os
import subprocess

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main():
    """Main entry point - launch Streamlit app."""
    try:
        # Run streamlit
        app_path = os.path.join(os.path.dirname(__file__), "streamlit_app.py")
        subprocess.run([sys.executable, "-m", "streamlit", "run", app_path])

    except Exception as e:
        print(f"Error starting application: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
