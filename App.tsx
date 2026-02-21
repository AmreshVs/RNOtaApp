/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NewAppScreen } from '@react-native/new-app-screen';
import { StatusBar, StyleSheet, Text, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import RNRestart from 'react-native-restart';

import {
  checkForUpdate,
  downloadUpdate,
  applyUpdate,
  rollbackIfNeeded,
  markSuccess,
  ensureOTADirs,
} from './ota/otaManager';
import { useEffect, useMemo } from 'react';

import { APP_VERSION } from './version';
import { getInstalledVersion } from './ota/otaManager';


function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    initOTA();
  }, []);

  const initOTA = async () => {
    await ensureOTADirs();
    await rollbackIfNeeded();

    const installedVersion = await getInstalledVersion();
    const currentVersion = installedVersion || APP_VERSION;


    const update = await checkForUpdate(currentVersion);
    console.log({
      APP_VERSION,
      installedVersion,
      currentVersion,
      serverVersion: update?.version,
    });

    if (update && !__DEV__) {
      try {
        if (installedVersion === update.version) {
          console.log('Already on latest OTA');
          await markSuccess();
          return;
        }

        const zip = await downloadUpdate(update.bundleUrl);
        await applyUpdate(zip, update.version);

        RNRestart.restart();
      } catch (e) {
        console.log('OTA failed', e);
      }
    } else {
      await markSuccess();
    }
  };


  const installedVersion = useMemo(() => getInstalledVersion(), [])

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{ flexDirection: 'row' }}>
        <Text style={{ color: '#000'}}>App Version - {APP_VERSION}</Text>
        <Text style={{ color: '#000', marginLeft: 10}}>OTA Installed Version - {installedVersion}</Text>
      </SafeAreaView>
      <SafeAreaView style={{ flexDirection: 'row' }}>
        <Text style={{ color: '#000'}}>OTA Update applied by Amresh</Text>
      </SafeAreaView>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <NewAppScreen
        templateFileName="App.tsx"
        safeAreaInsets={safeAreaInsets}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
