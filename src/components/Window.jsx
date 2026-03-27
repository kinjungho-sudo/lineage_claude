import React, { useState, useEffect, useRef } from 'react';

const Window = ({ title, onClose, children, initialPosition = { x: 0, y: 0 }, className = '' }) => {
    const [position, setPosition] = useState(initialPosition);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const windowRef = useRef(null);

    // Drag Logic
    const handleMouseDown = (e) => {
        if (e.target.closest('.window-close-btn')) return;
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    const handleTouchStart = (e) => {
        if (e.target.closest('.window-close-btn')) return;
        setIsDragging(true);
        const touch = e.touches[0];
        dragStartRef.current = {
            x: touch.clientX - position.x,
            y: touch.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            setPosition({
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y
            });
        };

        const handleTouchMove = (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            setPosition({
                x: touch.clientX - dragStartRef.current.x,
                y: touch.clientY - dragStartRef.current.y
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div
            ref={windowRef}
            className={`absolute shadow-2xl overflow-hidden retro-window pointer-events-auto ${className}`}
            style={{
                left: position.x,
                top: position.y,
                zIndex: isDragging ? 50 : 10,
                maxWidth: '100vw',
                maxHeight: '100vh'
            }}
        >
            {/* Title Bar */}
            <div
                className="bg-[#2a2a2a] h-8 flex items-center justify-between px-2 cursor-move border-b border-[#3f3f3f] select-none touch-none"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                <span className="text-[#a59c77] font-bold text-xs tracking-wider">{title}</span>
                <button
                    onClick={onClose}
                    className="window-close-btn text-[#666] hover:text-white font-bold text-xs px-1 h-full flex items-center"
                >
                    X
                </button>
            </div>

            {/* Content Content */}
            <div className="bg-[#1a1a1a] p-1 h-[calc(100%-2rem)] overflow-hidden">
                {children}
            </div>
        </div>
    );
};

export default Window;
