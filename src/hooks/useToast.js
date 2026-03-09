import { useState, useCallback, useRef } from 'react';

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const showToast = useCallback((message, type = "success") => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type, exiting: false }]);
    timersRef.current[id] = setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete timersRef.current[id];
      }, 300);
    }, 3000);
    return id;
  }, []);

  return { toasts, showToast };
}
