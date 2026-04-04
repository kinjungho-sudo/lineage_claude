import React, { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

const DraggableWindow = ({ title, children, onClose, defaultPosition, defaultSize }) => {
    const isMobile = useIsMobile();
    const [position, setPosition] = useState(defaultPosition || { x: 100, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        setIsDragging(true);
        dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    if (isMobile) {
        return (
            <div className="fixed inset-0 z-[150] flex flex-col justify-end">
                <div className="absolute inset-0 bg-black/60" onClick={onClose} />
                <div className="relative bg-[#1a1a1a] border-t-2 border-[#555] shadow-[0_-10px_40px_rgba(0,0,0,0.9)] flex flex-col" style={{ maxHeight: '70vh' }}>
                    <div className="bg-[#2a2a2a] px-4 py-3 border-b border-[#444] flex justify-between items-center">
                        <span className="text-sm font-bold text-[#d4af37]">{title}</span>
                        <button onClick={onClose} className="text-gray-400 hover:text-white w-11 h-11 flex items-center justify-center rounded hover:bg-red-900/50 transition-colors text-lg">✕</button>
                    </div>
                    <div className="flex-1 overflow-auto bg-black/90 relative custom-scrollbar">
                        {children}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="absolute bg-[#1a1a1a] border border-[#555] shadow-[0_0_15px_rgba(0,0,0,0.8)] flex flex-col z-50 text-gray-200 select-none overflow-hidden"
            style={{ left: position.x, top: position.y, width: defaultSize?.width || '320px', height: defaultSize?.height || '480px' }}
        >
            <div
                className="bg-[#2a2a2a] p-2 border-b border-[#444] flex justify-between items-center cursor-move active:bg-[#333]"
                onMouseDown={handleMouseDown}
            >
                <span className="text-sm font-bold text-[#d4af37] px-1 drop-shadow-md">{title}</span>
                <button onClick={onClose} className="text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-red-900/50 transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-auto bg-black/90 relative custom-scrollbar">
                {children}
            </div>
        </div>
    );
};

export default DraggableWindow;
