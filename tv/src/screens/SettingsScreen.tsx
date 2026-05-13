// tv/src/screens/SettingsScreen.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Pressable,
    type PressableStateCallbackType,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SERVER_URL } from '../config';

const SERVER_URL_STORAGE_KEY = '@wod_wiki_server_url';

function isValidWebSocketUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return (parsed.protocol === 'ws:' || parsed.protocol === 'wss:') && parsed.hostname.length > 0;
    } catch {
        return false;
    }
}

export function SettingsScreen() {
    const navigation = useNavigation();
    const [serverUrl, setServerUrl] = useState(SERVER_URL);
    const [isLoading, setIsLoading] = useState(true);
    const [isUrlFocused, setIsUrlFocused] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadSavedUrl = async () => {
            try {
                const storedServerUrl = await AsyncStorage.getItem(SERVER_URL_STORAGE_KEY);
                if (isMounted && storedServerUrl) {
                    setServerUrl(storedServerUrl);
                }
            } catch (storageError) {
                console.error('Failed to load server URL from storage', storageError);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadSavedUrl();

        return () => {
            isMounted = false;
            if (navigateTimerRef.current) {
                clearTimeout(navigateTimerRef.current);
            }
        };
    }, []);

    const handleSave = async () => {
        const trimmedUrl = serverUrl.trim();

        if (!isValidWebSocketUrl(trimmedUrl)) {
            setError('Please enter a valid ws:// or wss:// URL');
            setSaved(false);
            return;
        }

        try {
            await AsyncStorage.setItem(SERVER_URL_STORAGE_KEY, trimmedUrl);
            setServerUrl(trimmedUrl);
            setError(null);
            setSaved(true);

            if (navigateTimerRef.current) {
                clearTimeout(navigateTimerRef.current);
            }

            navigateTimerRef.current = setTimeout(() => {
                navigation.navigate('Home' as never);
            }, 2000);
        } catch (storageError) {
            console.error('Failed to save server URL', storageError);
            setError('Failed to save settings. Please try again.');
            setSaved(false);
        }
    };

    return (
        <View style={styles.container}>
            <Pressable
                style={({ focused }: PressableStateCallbackType) => [
                    styles.backButton,
                    focused && styles.focusRing
                ]}
                onPress={() => navigation.navigate('Home' as never)}
            >
                <Text style={styles.backButtonText}>← Back</Text>
            </Pressable>

            <View style={styles.content}>
                <Text style={styles.title}>Settings</Text>
                <Text style={styles.sectionHeader}>Server Connection</Text>
                <Text style={styles.inputLabel}>Server URL</Text>

                <TextInput
                    value={serverUrl}
                    onChangeText={(text: string) => {
                        setServerUrl(text);
                        if (error) {
                            setError(null);
                        }
                    }}
                    editable={!isLoading}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    placeholder="ws://10.0.2.2:8080"
                    placeholderTextColor="#666"
                    onFocus={() => setIsUrlFocused(true)}
                    onBlur={() => setIsUrlFocused(false)}
                    style={[styles.input, isUrlFocused && styles.focusRing]}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {saved ? <Text style={styles.savedText}>✓ Saved</Text> : null}

                <Pressable
                    style={({ focused }: PressableStateCallbackType) => [
                        styles.saveButton,
                        focused && styles.focusRing
                    ]}
                    onPress={handleSave}
                >
                    <Text style={styles.saveButtonText}>Save Settings</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212'
    },
    content: {
        flex: 1,
        paddingHorizontal: 64,
        paddingTop: 72
    },
    title: {
        color: '#ffffff',
        fontSize: 36,
        fontWeight: '700',
        marginBottom: 24
    },
    sectionHeader: {
        color: '#888888',
        fontSize: 14,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.6
    },
    inputLabel: {
        color: '#ffffff',
        fontSize: 18,
        marginBottom: 10
    },
    input: {
        minHeight: 56,
        borderWidth: 2,
        borderColor: '#444444',
        borderRadius: 10,
        color: '#ffffff',
        fontSize: 18,
        backgroundColor: '#1f1f1f',
        paddingHorizontal: 16,
        marginBottom: 16
    },
    saveButton: {
        minHeight: 56,
        borderRadius: 10,
        backgroundColor: '#4ade80',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        borderWidth: 2,
        borderColor: 'transparent',
        marginTop: 12,
        maxWidth: 320
    },
    saveButtonText: {
        color: '#052e16',
        fontSize: 20,
        fontWeight: '700'
    },
    backButton: {
        alignSelf: 'flex-start',
        marginTop: 24,
        marginLeft: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'transparent'
    },
    backButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600'
    },
    savedText: {
        color: '#4ade80',
        fontSize: 18,
        marginTop: 4
    },
    errorText: {
        color: '#f87171',
        fontSize: 16,
        marginTop: 4
    },
    focusRing: {
        borderColor: '#4ade80',
        borderWidth: 2
    }
});
