def load_css():
    return """
    <style>
    /* Import Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    /* Main Colors & Variables */
    :root {
        --primary: #2563eb;
        --primary-hover: #1d4ed8;
        --success: #10b981;
        --danger: #ef4444;
        --warning: #f59e0b;
        --background: #f8fafc;
        --surface: #ffffff;
        --text-main: #1e293b;
        --text-light: #64748b;
        --border: #e2e8f0;
        --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        --radius: 0.5rem;
    }

    /* Global Typography */
    html, body, [class*="css"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
    }

    [data-testid="stAppViewContainer"] {
        background-color: var(--background) !important;
    }

    .main {
        background-color: var(--background) !important;
    }

    /* Main Container */
    .main .block-container {
        padding-top: 2rem;
        padding-bottom: 2rem;
        max-width: 1200px;
    }

    /* Headers */
    h1, h2, h3, h4, h5, h6 {
        color: var(--text-main) !important;
        font-weight: 700 !important;
        letter-spacing: -0.025em;
    }

    h1 { font-size: 2.25rem !important; }
    h2 { 
        font-size: 1.5rem !important; 
        margin-bottom: 1.5rem !important; 
        margin-top: 2rem !important;
    }
    h3 { font-size: 1.25rem !important; }

    /* Sidebar */
    [data-testid="stSidebar"] {
        background-color: var(--surface) !important;
        border-right: 1px solid var(--border) !important;
    }

    [data-testid="stSidebar"] h3 {
        color: var(--text-main) !important;
        font-size: 0.875rem !important;
        font-weight: 600 !important;
        letter-spacing: 0.05em !important;
    }

    /* Buttons */
    .stButton > button {
        background: linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%) !important;
        color: white !important;
        border: none !important;
        border-radius: var(--radius) !important;
        font-weight: 600 !important;
        padding: 0.625rem 1.25rem !important;
        transition: all 0.2s ease-in-out !important;
        box-shadow: var(--shadow-sm) !important;
    }

    .stButton > button:hover {
        background: linear-gradient(135deg, var(--primary-hover) 0%, var(--primary) 100%) !important;
        transform: translateY(-1px);
        box-shadow: var(--shadow-md) !important;
    }

    .stButton > button:active {
        transform: translateY(0);
    }

    /* Form Labels */
    .stTextInput label, 
    .stNumberInput label, 
    .stTextArea label,
    .stSelectbox label {
        color: var(--text-main) !important;
        font-weight: 500 !important;
        font-size: 0.875rem !important;
        margin-bottom: 0.5rem !important;
    }

    /* Input Fields */
    .stTextInput input, 
    .stNumberInput input, 
    .stTextArea textarea,
    .stSelectbox [data-baseweb="select"] {
        background-color: var(--surface) !important;
        border: 1.5px solid var(--border) !important;
        border-radius: var(--radius) !important;
        color: var(--text-main) !important;
        font-size: 0.875rem !important;
        padding: 0.5rem 0.75rem !important;
        transition: border-color 0.2s ease !important;
    }

    .stTextInput input::placeholder,
    .stNumberInput input::placeholder,
    .stTextArea textarea::placeholder {
        color: var(--text-light) !important;
        opacity: 0.6;
    }

    .stTextInput input:focus, 
    .stNumberInput input:focus, 
    .stTextArea textarea:focus {
        border-color: var(--primary) !important;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1) !important;
        outline: none !important;
    }

    /* Metric Cards */
    [data-testid="stMetricContainer"] {
        background-color: var(--surface) !important;
        border: 1px solid var(--border) !important;
        border-radius: var(--radius) !important;
        padding: 1.5rem !important;
        box-shadow: var(--shadow-sm) !important;
        transition: box-shadow 0.2s ease !important;
    }

    [data-testid="stMetricContainer"]:hover {
        box-shadow: var(--shadow-md) !important;
    }

    [data-testid="stMetricLabel"] {
        color: var(--text-light) !important;
        font-size: 0.875rem !important;
        font-weight: 500 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
    }

    [data-testid="stMetricValue"] {
        color: var(--text-main) !important;
        font-size: 1.875rem !important;
        font-weight: 700 !important;
    }

    /* DataFrames */
    [data-testid="stDataFrame"] {
        border: 1px solid var(--border) !important;
        border-radius: var(--radius) !important;
        box-shadow: var(--shadow-sm) !important;
        overflow: hidden !important;
    }

    [data-testid="stDataFrame"] thead th {
        background-color: #f1f5f9 !important;
        color: var(--text-main) !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        font-size: 0.75rem !important;
        letter-spacing: 0.05em !important;
        padding: 0.75rem 1rem !important;
    }

    [data-testid="stDataFrame"] tbody td {
        color: var(--text-main) !important;
        padding: 0.75rem 1rem !important;
    }

    [data-testid="stDataFrame"] tbody tr {
        border-bottom: 1px solid var(--border) !important;
    }

    [data-testid="stDataFrame"] tbody tr:hover {
        background-color: #f8fafc !important;
    }

    /* Alert Messages */
    .stAlert {
        border-radius: var(--radius) !important;
        border-left-width: 4px !important;
    }

    [data-baseweb="notification"] {
        border-radius: var(--radius) !important;
    }

    /* Info Alert */
    [data-baseweb="notification"][kind="info"] {
        background-color: #eff6ff !important;
        border: 1px solid #bfdbfe !important;
        border-left: 4px solid var(--primary) !important;
    }

    [data-baseweb="notification"][kind="info"] svg {
        fill: var(--primary) !important;
    }

    /* Success Alert */
    [data-baseweb="notification"][kind="positive"] {
        background-color: #ecfdf5 !important;
        border: 1px solid #a7f3d0 !important;
        border-left: 4px solid var(--success) !important;
    }

    [data-baseweb="notification"][kind="positive"] svg {
        fill: var(--success) !important;
    }

    /* Warning Alert */
    [data-baseweb="notification"][kind="warning"] {
        background-color: #fffbeb !important;
        border: 1px solid #fde68a !important;
        border-left: 4px solid var(--warning) !important;
    }

    [data-baseweb="notification"][kind="warning"] svg {
        fill: var(--warning) !important;
    }

    /* Error Alert */
    [data-baseweb="notification"][kind="error"] {
        background-color: #fef2f2 !important;
        border: 1px solid #fecaca !important;
        border-left: 4px solid var(--danger) !important;
    }

    [data-baseweb="notification"][kind="error"] svg {
        fill: var(--danger) !important;
    }
    
    /* Containers with Borders */
    [data-testid="stVerticalBlockBorderWrapper"] {
        background-color: var(--surface) !important;
        border: 1px solid var(--border) !important;
        border-radius: var(--radius) !important;
        box-shadow: var(--shadow-sm) !important;
        padding: 1rem !important;
    }

    /* Radio Buttons (Sidebar Menu) */
    .stRadio > div[role="radiogroup"] {
        gap: 0.25rem !important;
    }

    .stRadio label {
        background-color: transparent !important;
        border: none !important;
        padding: 0.625rem 1rem !important;
        border-radius: var(--radius) !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        color: var(--text-main) !important;
    }

    .stRadio label:hover {
        background-color: #f1f5f9 !important;
    }

    .stRadio label[data-checked="true"] {
        background-color: #e0e7ff !important;
        color: var(--primary) !important;
        font-weight: 600 !important;
    }

    /* Dividers */
    hr {
        border: none !important;
        border-top: 1px solid var(--border) !important;
        margin: 2rem 0 !important;
    }

    /* File Uploader */
    [data-testid="stFileUploader"] {
        border-radius: var(--radius) !important;
    }

    [data-testid="stFileUploader"] > div {
        border: 2px dashed var(--border) !important;
        border-radius: var(--radius) !important;
        background-color: var(--surface) !important;
    }

    [data-testid="stFileUploader"] > div:hover {
        border-color: var(--primary) !important;
        background-color: #f8fafc !important;
    }

    /* Captions */
    .stCaptionContainer, [data-testid="stCaptionContainer"] {
        color: var(--text-light) !important;
        font-size: 0.875rem !important;
    }

    /* Markdown */
    .stMarkdown {
        color: var(--text-main) !important;
    }

    /* General Text */
    p, span, div, label {
        color: var(--text-main) !important;
    }

    /* Align text input and button in the same row */
    div[data-testid="column"] {
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-end !important;
    }
    
    /* Ensure text input container doesn't have extra bottom margin */
    .stTextInput > div {
        margin-bottom: 0 !important;
    }
    
    /* Ensure button container aligns properly */
    .stButton {
        margin-top: 0 !important;
    }
    
    /* Make text input and button same height */
    .stTextInput input {
        height: 2.75rem !important;
        box-sizing: border-box !important;
    }
    
    .stButton > button {
        height: 2.75rem !important;
        box-sizing: border-box !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }

    /* Splash Screen */
    .splash-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(248, 250, 252, 0.98);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }

    .splash-content {
        text-align: center;
        animation: slideUp 0.8s ease-out;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .splash-logo {
        font-size: 4rem;
        margin-bottom: 1rem;
        animation: bounce 1s ease-in-out infinite;
    }

    @keyframes bounce {
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-10px);
        }
    }

    .splash-title {
        font-size: 2rem;
        font-weight: 700;
        color: var(--text-main);
        margin-bottom: 0.5rem;
        letter-spacing: -0.025em;
    }

    .splash-subtitle {
        font-size: 1rem;
        color: var(--text-light);
        margin-bottom: 2rem;
    }

    .splash-loader {
        width: 60px;
        height: 60px;
        border: 4px solid #e2e8f0;
        border-top: 4px solid var(--primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .splash-dots {
        display: flex;
        gap: 0.5rem;
        margin-top: 1.5rem;
        justify-content: center;
    }

    .splash-dot {
        width: 10px;
        height: 10px;
        background-color: var(--primary);
        border-radius: 50%;
        animation: pulse 1.5s ease-in-out infinite;
    }

    .splash-dot:nth-child(1) {
        animation-delay: 0s;
    }

    .splash-dot:nth-child(2) {
        animation-delay: 0.2s;
    }

    .splash-dot:nth-child(3) {
        animation-delay: 0.4s;
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
        }
        50% {
            opacity: 1;
            transform: scale(1.2);
        }
    }

    </style>
    """
