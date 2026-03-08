const fs = require('fs');
const svgData = fs.readFileSync('public/LogoDarkBlack.svg', 'utf8');
const match = svgData.match(/d="([^"]+)"/);

if (match) {
    let dAttr = match[1];

    const jsxContent = `import React from 'react';
import { motion } from 'framer-motion';

const AnimatedBackground = () => {
    return (
        <div 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
            }}
        >
            <motion.svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 1080 1080"
                style={{
                    width: '150vmax',
                    height: '150vmax',
                    position: 'absolute',
                    opacity: 0.03,
                }}
                animate={{
                    rotate: 360,
                    scale: [1, 1.05, 1],
                }}
                transition={{
                    rotate: {
                        duration: 180,
                        ease: "linear",
                        repeat: Infinity,
                    },
                    scale: {
                        duration: 20,
                        ease: "easeInOut",
                        repeat: Infinity,
                    }
                }}
            >
                <path 
                    style={{ fill: 'var(--color-primary)', stroke: 'none' }} 
                    d="${dAttr}"
                />
            </motion.svg>
        </div>
    );
};

export default AnimatedBackground;
`;
    fs.writeFileSync('src/components/AnimatedBackground.jsx', jsxContent);
    console.log("Generated AnimatedBackground.jsx");
} else {
    console.error("Could not find d attribute in SVG.");
}
