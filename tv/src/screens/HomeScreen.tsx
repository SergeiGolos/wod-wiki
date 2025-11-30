// tv/src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { webSocketService } from '../services/ServiceContainer';
import { useNavigation } from '@react-navigation/native';
import { SERVER_URL } from '../config';

export function HomeScreen() {
  const [isConnected, setIsConnected] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    webSocketService.connect(SERVER_URL).then(() => {
        setIsConnected(true);
    }).catch(err => {
        console.error('Failed to connect', err);
    });

    webSocketService.on('connected', () => setIsConnected(true));
    webSocketService.on('disconnected', () => setIsConnected(false));

    webSocketService.on('castRequest', (payload) => {
        navigation.navigate('Workout' as never, {
            sessionId: payload.sessionId,
            workout: payload.workout
        } as never);
    });

    return () => {
        // Cleanup listeners if needed
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WOD Wiki TV</Text>
      <View style={styles.statusContainer}>
          {isConnected ? (
              <Text style={styles.connectedText}>Ready to Cast</Text>
          ) : (
              <View style={styles.connecting}>
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text style={styles.statusText}>Connecting to relay...</Text>
              </View>
          )}
      </View>
      <Text style={styles.hint}>Open WOD Wiki on your phone or computer to start a workout</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 48,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 32,
  },
  statusContainer: {
      marginBottom: 32,
  },
  connectedText: {
      fontSize: 24,
      color: '#4ade80',
  },
  connecting: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  statusText: {
      fontSize: 24,
      color: '#aaaaaa',
      marginLeft: 16,
  },
  hint: {
      fontSize: 18,
      color: '#666666',
  }
});
