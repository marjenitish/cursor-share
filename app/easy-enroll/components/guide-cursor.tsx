'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface GuideCursorProps {
    targetSelector: string;
    onComplete?: () => void;
}

export function GuideCursor({ targetSelector, onComplete }: GuideCursorProps) {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        console.log('GuideCursor mounted, looking for target:', targetSelector);
        
        // Wait for the target element to be available
        const checkTarget = setInterval(() => {
            const target = document.querySelector(targetSelector);
            console.log('Target:', target);
            console.log('Target selector:', targetSelector);
            if (target) {
                console.log('Target found:', target);
                const rect = target.getBoundingClientRect();
                console.log('Target position:', rect);
                setPosition({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                });
                setIsVisible(true);
                clearInterval(checkTarget);
            } else {
                console.log('Target not found yet');
            }
        }, 100);

        return () => clearInterval(checkTarget);
    }, [targetSelector]);

    useEffect(() => {
        if (isVisible) {
            console.log('Cursor is visible at position:', position);
            // Hide the cursor after 10 seconds
            const timer = setTimeout(() => {
                setIsVisible(false);
                onComplete?.();
            }, 10000);

            return () => clearTimeout(timer);
        }
    }, [isVisible, onComplete, position]);

    if (!isVisible) return null;

    return (
        <motion.div
            className="fixed pointer-events-none z-[9999]"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
                opacity: 1, 
                scale: 1,
                x: position.x,
                y: position.y
            }}
            transition={{
                duration: 1,
                ease: "easeOut"
            }}
            style={{
                transform: `translate(-50%, -50%)`,
            }}
        >
            <motion.div
                className="relative"
                animate={{
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                {/* Cursor */}
                <div className="w-12 h-12 border-4 border-primary rounded-full bg-primary/20" />
                
                {/* Click effect */}
                <motion.div
                    className="absolute inset-0 border-4 border-primary rounded-full"
                    animate={{
                        scale: [1, 1.5],
                        opacity: [1, 0],
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeOut"
                    }}
                />
                
                {/* Text hint */}
                <motion.div
                    className="absolute -top-16 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-lg whitespace-nowrap text-lg font-medium"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    Click one of the exercise types to start
                </motion.div>
            </motion.div>
        </motion.div>
    );
} 