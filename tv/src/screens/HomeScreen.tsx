// tv/src/screens/HomeScreen.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    type PressableStateCallbackType,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SERVER_URL } from '../config';
import { webSocketService } from '../services/ServiceContainer';

const SERVER_URL_STORAGE_KEY = '@wod_wiki_server_url';

export function HomeScreen() {
    const [isConnected, setIsConnected] = useState(false);
    const navigation = useNavigation();

    useEffect(() => {
        let isMounted = true;

        const handleConnected = () => {
            if (isMounted) {
                setIsConnected(true);
            }
        };

        const handleDisconnected = () => {
            if (isMounted) {
                setIsConnected(false);
            }
        };

        const handleCastRequest = (payload: { sessionId: string; workout: unknown }) => {
            navigation.navigate(
                'Workout' as never,
                {
                    sessionId: payload.sessionId,
                    workout: payload.workout
                } as never
            );
        };

        const connectToRelay = async () => {
            try {
                const url = (await AsyncStorage.getItem(SERVER_URL_STORAGE_KEY)) ?? SERVER_URL;
                await webSocketService.connect(url);
                handleConnected();
            } catch (connectionError) {
                console.error('Failed to connect', connectionError);
            }
        };

        connectToRelay();

        webSocketService.on('connected', handleConnected);
        webSocketService.on('disconnected', handleDisconnected);
        webSocketService.on('castRequest', handleCastRequest);

        return () => {
            isMounted = false;
            webSocketService.off('connected', handleConnected);
            webSocketService.off('disconnected', handleDisconnected);
            webSocketService.off('castRequest', handleCastRequest);
        };
    }, [navigation]);

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

            <Pressable
                style={({ focused }: PressableStateCallbackType) => [
                    styles.settingsButton,
                    focused && styles.focusRing
                ]}
                onPress={() => navigation.navigate('Settings' as never)}
            >
                <Text style={styles.settingsButtonText}>⚙ Settings</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        alignItems: 'center',
        justifyContent: 'center'
    },
    title: {
        fontSize: 48,
        color: '#ffffff',
        fontWeight: 'bold',
        marginBottom: 32
    },
    statusContainer: {
        marginBottom: 32
    },
    connectedText: {
        fontSize: 24,
        color: '#4ade80'
    },
    connecting: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    statusText: {
        fontSize: 24,
        color: '#aaaaaa',
        marginLeft: 16
    },
    hint: {
        fontSize: 18,
        color: '#666666'
    },
    settingsButton: {
        position: 'absolute',
        right: '5%',
        bottom: '5%',
        minHeight: 56,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center'
    },
    settingsButtonText: {
        fontSize: 16,
        color: '#666666'
    },
    focusRing: {
        borderColor: '#4ade80',
        borderWidth: 2
    }
});
