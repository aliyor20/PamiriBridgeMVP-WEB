import React, { createContext, useContext, useState, useCallback } from 'react';
import { useHaptic } from '../hooks/useHaptic';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const haptic = useHaptic();

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);

        // Haptic feedback
        if (type === 'success') haptic('success');
        else if (type === 'error') haptic('error');
        else haptic('light');

        // Auto-dismiss
        setTimeout(() => {
            removeToast(id);
        }, 3000);
    }, [haptic]);

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} />
        </ToastContext.Provider>
    );
};

function ToastContainer({ toasts }) {
    return (
        <div className="toast-container" style={{ pointerEvents: 'none' }}>
            {toasts.map((toast) => (
                <DraggableToast key={toast.id} toast={toast} />
            ))}
        </div>
    );
}

function DraggableToast({ toast }) {
    const { removeToast } = useToast();
    const [offsetY, setOffsetY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);

    const handleTouchStart = (e) => {
        setIsDragging(true);
        setStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        if (diff > -20 && diff < 150) { // allow dragging down mostly
            setOffsetY(diff);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (offsetY > 50) {
            removeToast(toast.id);
        } else {
            setOffsetY(0);
        }
    };

    return (
        <div
            className={`toast-pill toast-enter ${toast.type}`}
            style={{
                transform: `translateY(${offsetY}px)`,
                transition: isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
                opacity: 1 - (offsetY / 100),
                pointerEvents: 'auto'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {toast.message}
        </div>
    );
}
