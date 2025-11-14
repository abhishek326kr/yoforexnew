import { useRef, useEffect } from 'react';

/**
 * Hook to store the latest value in a ref without triggering re-renders.
 * Useful for storing callbacks that should always use the latest version
 * without causing useEffect dependencies to re-run.
 * 
 * @example
 * const onMessageRef = useLatestRef(onMessage);
 * useEffect(() => {
 *   socket.on('message', (data) => onMessageRef.current(data));
 * }, [socket]); // Only depends on socket, not onMessage
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref;
}
