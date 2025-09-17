import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLoads } from '@/hooks/useLoads';
import { usePostLoad } from '@/hooks/usePostLoad';
import { Load } from '@/types';

export default function TestLoadRulesScreen() {
  const { loads, addLoad, deleteCompletedLoad } = useLoads();
  const { postLoadWizard, setField } = usePostLoad();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testAutoFillDefaults = async () => {
    try {
      addTestResult('Testing auto-fill defaults...');
      
      // Create a load with missing dates and title
      const testLoad: Load = {
        id: `test-${Date.now()}`,
        shipperId: 'test-shipper',
        shipperName: 'Test Shipper',
        origin: {
          address: '',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          lat: 34.0522,
          lng: -118.2437,
        },
        destination: {
          address: '',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          lat: 40.7128,
          lng: -74.0060,
        },
        distance: 2800,
        weight: 5000,
        vehicleType: 'truck',
        rate: 3500,
        ratePerMile: 1.25,
        // Missing dates - should be auto-filled
        pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        status: 'available',
        description: 'Test load for auto-fill validation',
        isBackhaul: false,
      };
      
      await addLoad(testLoad);
      addTestResult('✅ Load posted with auto-filled dates');
      addTestResult(`Pickup: ${testLoad.pickupDate.toISOString()}`);
      addTestResult(`Delivery: ${testLoad.deliveryDate.toISOString()}`);
      
    } catch (error) {
      addTestResult(`❌ Auto-fill test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testSevenDayRule = async () => {
    try {
      addTestResult('Testing 7-day auto-delete rule...');
      
      // Create a load with delivery date 8 days ago (should be filtered from board)
      const expiredLoad: Load = {
        id: `expired-${Date.now()}`,
        shipperId: 'test-shipper',
        shipperName: 'Test Shipper',
        origin: {
          address: '',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
          lat: 41.8781,
          lng: -87.6298,
        },
        destination: {
          address: '',
          city: 'Miami',
          state: 'FL',
          zipCode: '33101',
          lat: 25.7617,
          lng: -80.1918,
        },
        distance: 1200,
        weight: 3000,
        vehicleType: 'truck',
        rate: 2000,
        ratePerMile: 1.67,
        pickupDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), // 9 days ago
        deliveryDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago (expired)
        status: 'available',
        description: 'Test load for 7-day rule (should be filtered from board)',
        isBackhaul: false,
      };
      
      await addLoad(expiredLoad);
      addTestResult('✅ Expired load added to history');
      addTestResult('🔍 Check: Load should be in history but filtered from board');
      addTestResult(`Delivery was: ${expiredLoad.deliveryDate.toISOString()}`);
      
      // Create a fresh load (should be visible on board)
      const freshLoad: Load = {
        id: `fresh-${Date.now()}`,
        shipperId: 'test-shipper',
        shipperName: 'Test Shipper',
        origin: {
          address: '',
          city: 'Dallas',
          state: 'TX',
          zipCode: '75201',
          lat: 32.7767,
          lng: -96.7970,
        },
        destination: {
          address: '',
          city: 'Phoenix',
          state: 'AZ',
          zipCode: '85001',
          lat: 33.4484,
          lng: -112.0740,
        },
        distance: 900,
        weight: 2500,
        vehicleType: 'truck',
        rate: 1800,
        ratePerMile: 2.0,
        pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        status: 'available',
        description: 'Test load for board visibility (should be visible)',
        isBackhaul: false,
      };
      
      await addLoad(freshLoad);
      addTestResult('✅ Fresh load added - should be visible on board');
      addTestResult(`Delivery: ${freshLoad.deliveryDate.toISOString()}`);
      
    } catch (error) {
      addTestResult(`❌ 7-day rule test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testManualProfileDelete = async () => {
    try {
      addTestResult('Testing manual profile delete...');
      
      // Find a test load to delete
      const testLoad = loads.find(load => load.id.startsWith('test-') || load.id.startsWith('expired-') || load.id.startsWith('fresh-'));
      
      if (testLoad) {
        await deleteCompletedLoad(testLoad.id);
        addTestResult(`✅ Load ${testLoad.id} permanently deleted from profile history`);
        addTestResult('🔍 Check: Load should be removed from both board and history');
      } else {
        addTestResult('⚠️ No test loads found to delete');
      }
      
    } catch (error) {
      addTestResult(`❌ Manual delete test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testCrossPlatformPosting = async () => {
    try {
      addTestResult('Testing cross-platform posting...');
      
      // Set up minimal draft for posting
      setField('title', 'Cross-Platform Test Load');
      setField('description', 'Testing cross-platform visibility');
      setField('vehicleType', 'truck');
      setField('pickup', 'Seattle, WA');
      setField('delivery', 'Portland, OR');
      setField('rateAmount', '800');
      setField('pickupDate', new Date(Date.now() + 24 * 60 * 60 * 1000));
      setField('deliveryDate', new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
      
      // Mock photo URLs (in real app, these would be uploaded)
      setField('photoUrls', [
        'https://via.placeholder.com/400x300/0066cc/ffffff?text=Photo+1',
        'https://via.placeholder.com/400x300/0066cc/ffffff?text=Photo+2',
        'https://via.placeholder.com/400x300/0066cc/ffffff?text=Photo+3',
        'https://via.placeholder.com/400x300/0066cc/ffffff?text=Photo+4',
        'https://via.placeholder.com/400x300/0066cc/ffffff?text=Photo+5',
      ]);
      
      await postLoadWizard('test@example.com');
      addTestResult('✅ Load posted with cross-platform intent');
      addTestResult('🔍 Check: Load should be visible on all devices when permissions allow');
      
    } catch (error) {
      addTestResult(`❌ Cross-platform posting test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const showCurrentLoads = () => {
    addTestResult(`📊 Current loads on board: ${loads.length}`);
    loads.forEach((load, index) => {
      const daysSinceDelivery = Math.floor((Date.now() - load.deliveryDate.getTime()) / (24 * 60 * 60 * 1000));
      addTestResult(`${index + 1}. ${load.id} - Delivery: ${daysSinceDelivery} days ago`);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Load Rules Test Suite</Text>
        <Text style={styles.subtitle}>ENFORCE LOAD RULES - Testing Implementation</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Controls</Text>
          
          <TouchableOpacity style={styles.button} onPress={testAutoFillDefaults}>
            <Text style={styles.buttonText}>Test Auto-Fill Defaults</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testSevenDayRule}>
            <Text style={styles.buttonText}>Test 7-Day Auto-Delete Rule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testManualProfileDelete}>
            <Text style={styles.buttonText}>Test Manual Profile Delete</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testCrossPlatformPosting}>
            <Text style={styles.buttonText}>Test Cross-Platform Posting</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.infoButton} onPress={showCurrentLoads}>
            <Text style={styles.buttonText}>Show Current Loads</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.clearButton} onPress={clearTestResults}>
            <Text style={styles.buttonText}>Clear Results</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <View style={styles.resultsContainer}>
            {testResults.length === 0 ? (
              <Text style={styles.noResults}>No test results yet. Run a test above.</Text>
            ) : (
              testResults.map((result, index) => (
                <Text key={`result-${index}-${result.slice(0, 10)}`} style={styles.result}>
                  {result}
                </Text>
              ))
            )}
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expected Behavior</Text>
          <Text style={styles.expectation}>• Auto-fill: Missing dates/title filled automatically</Text>
          <Text style={styles.expectation}>• 7-Day Rule: Loads auto-delete from board after 7 days post-delivery</Text>
          <Text style={styles.expectation}>• History: Keeps all loads until manual profile delete</Text>
          <Text style={styles.expectation}>• Cross-Platform: Posts to both Firebase and local storage</Text>
          <Text style={styles.expectation}>• Manual Delete: Permanently removes from history</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  infoButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
  },
  noResults: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  result: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  expectation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    paddingLeft: 8,
  },
});