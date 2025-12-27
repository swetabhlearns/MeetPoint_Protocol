import { Canvas, FractalNoise, Rect } from '@shopify/react-native-skia';
import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';

interface NoiseBackgroundProps {
    children?: React.ReactNode;
}

export default function NoiseBackground({ children }: NoiseBackgroundProps) {
    // Use actual screen dimensions instead of hardcoded 10000x10000
    const { width, height } = useWindowDimensions();

    return (
        <React.Fragment>
            <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
                <Rect x={0} y={0} width={width} height={height}>
                    <FractalNoise freqX={0.8} freqY={0.8} octaves={4} seed={1} />
                </Rect>
                {/* Dark overlay to blend the noise */}
                <Rect x={0} y={0} width={width} height={height} color="#050505" opacity={0.92} />
            </Canvas>
            {children}
        </React.Fragment>
    );
}
