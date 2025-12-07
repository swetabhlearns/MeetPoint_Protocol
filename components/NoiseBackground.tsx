import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Canvas, Rect, FractalNoise } from '@shopify/react-native-skia';

interface NoiseBackgroundProps {
    children?: React.ReactNode;
    style?: ViewStyle;
}

export default function NoiseBackground({ children, style }: NoiseBackgroundProps) {
    return (
        <React.Fragment>
            <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
                <Rect x={0} y={0} width={10000} height={10000}>
                    <FractalNoise freqX={0.8} freqY={0.8} octaves={4} seed={1} />
                </Rect>
                {/* Dark overlay to blend the noise */}
                <Rect x={0} y={0} width={10000} height={10000} color="#050505" opacity={0.92} />
            </Canvas>
            {children}
        </React.Fragment>
    );
}
