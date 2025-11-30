// tv/src/screens/WorkoutScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { webSocketService } from '../services/ServiceContainer';
import { useNavigation, useRoute } from '@react-navigation/native';

export function WorkoutScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { sessionId, workout } = route.params as any;
    const [displayState, setDisplayState] = useState<any>(null);

    useEffect(() => {
        webSocketService.on('stateUpdate', (state) => {
            setDisplayState(state);
        });

        webSocketService.on('castStop', () => {
            navigation.goBack();
        });

        // Accept the cast
        webSocketService.acceptCast(sessionId);

        return () => {
            // cleanup
        };
    }, []);

    if (!displayState) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Loading workout...</Text>
            </View>
        );
    }

    const timer = displayState.timerStack?.[0];

    return (
        <View style={styles.container}>
            <Text style={styles.workoutTitle}>{workout.name || 'Workout'}</Text>

            <View style={styles.timerContainer}>
                {timer ? (
                    <>
                        <Text style={styles.timerText}>{formatTime(timer.durationMs || 0)}</Text>
                        <Text style={styles.timerLabel}>{timer.label || 'Work'}</Text>
                    </>
                ) : (
                    <Text style={styles.timerText}>--:--</Text>
                )}
            </View>

            <View style={styles.metricsContainer}>
                 <Text style={styles.metricText}>Round: {displayState.currentRound || 0} / {displayState.totalRounds || '-'}</Text>
            </View>
        </View>
    );
}

function formatTime(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
      color: '#fff',
      fontSize: 24,
      marginTop: 200,
  },
  workoutTitle: {
      fontSize: 32,
      color: '#aaaaaa',
      marginBottom: 48,
  },
  timerContainer: {
      alignItems: 'center',
      marginBottom: 64,
  },
  timerText: {
      fontSize: 140,
      color: '#ffffff',
      fontWeight: 'bold',
      fontVariant: ['tabular-nums'],
  },
  timerLabel: {
      fontSize: 48,
      color: '#4ade80',
      marginTop: 16,
  },
  metricsContainer: {
      flexDirection: 'row',
  },
  metricText: {
      fontSize: 32,
      color: '#ffffff',
  }
});
