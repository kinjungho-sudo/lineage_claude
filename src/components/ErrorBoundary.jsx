import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error: error, errorInfo: errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black text-red-500 p-8 font-mono overflow-auto flex flex-col items-center justify-center">
                    <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
                    <div className="bg-[#111] p-4 border border-red-900 rounded max-w-2xl w-full">
                        <h2 className="text-xl mb-2 break-words">{this.state.error && this.state.error.toString()}</h2>
                        <details className="whitespace-pre-wrap text-xs text-gray-400 mt-2">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </details>
                    </div>
                    <button
                        className="mt-6 px-6 py-3 bg-red-800 text-white rounded hover:bg-red-700 font-bold"
                        onClick={() => {
                            localStorage.clear();
                            window.location.reload();
                        }}
                    >
                        Reset Data & Reload (Clear LocalStorage)
                    </button>
                    <p className="mt-4 text-gray-500 text-xs">
                        If clicking the button doesn't help, try manually clearing your browser cache/cookies for this site.
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
