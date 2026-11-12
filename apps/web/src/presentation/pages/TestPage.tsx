/**
 * Test Page for Backend Testing (L1 Presentation)
 * Minimal UI to test Solid Pod integration
 */

import { useState, useEffect } from 'react';
import { container } from '@/app/container';
import type { BodyMeasurement } from '@/domain/body/entities';
import { calculateBMI } from '@/domain/body/entities';

export const TestPage = () => {
  const [webId, setWebId] = useState<string | null>(null);
  const [oidcIssuer, setOidcIssuer] = useState('https://solidcommunity.net');
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [weightKg, setWeightKg] = useState('70');
  const [heightCm, setHeightCm] = useState('170');

  useEffect(() => {
    // Restore session on mount
    const restoreSession = async () => {
      const result = await container.authSession.restore();
      if (result) {
        setWebId(result.webId);
        addTestResult(`✓ Session restored: ${result.webId}`);
      } else {
        addTestResult('ℹ No existing session');
      }
    };
    restoreSession();
  }, []);

  const addTestResult = (message: string) => {
    setTestResults((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      addTestResult(`Initiating login to ${oidcIssuer}...`);
      await container.loginUseCase(oidcIssuer);
    } catch (error) {
      addTestResult(`✗ Login failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      addTestResult('Logging out...');
      await container.logoutUseCase();
      setWebId(null);
      setMeasurements([]);
      container.resetRepositories();
      addTestResult('✓ Logged out successfully');
    } catch (error) {
      addTestResult(`✗ Logout failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeasurement = async () => {
    if (!webId) {
      addTestResult('✗ Not authenticated');
      return;
    }

    try {
      setLoading(true);
      const date = new Date().toISOString().split('T')[0];
      
      addTestResult(`Adding measurement: ${weightKg}kg, ${heightCm}cm...`);
      
      const result = await container.addMeasurementUseCase({
        date: date ?? '',
        weightKg: parseFloat(weightKg),
        heightCm: parseFloat(heightCm),
      });

      if (result.ok) {
        addTestResult(`✓ Measurement added successfully (ID: ${result.value})`);
        await handleListMeasurements();
      } else {
        addTestResult(`✗ Failed to add measurement: ${result.error.message}`);
      }
    } catch (error) {
      addTestResult(`✗ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleListMeasurements = async () => {
    if (!webId) {
      addTestResult('✗ Not authenticated');
      return;
    }

    try {
      setLoading(true);
      addTestResult('Fetching measurements from Pod...');
      
      const result = await container.listMeasurementsUseCase();

      if (result.ok) {
        setMeasurements(result.value);
        addTestResult(`✓ Found ${result.value.length} measurement(s)`);
      } else {
        addTestResult(`✗ Failed to list measurements: ${result.error.message}`);
      }
    } catch (error) {
      addTestResult(`✗ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const testPodConnection = async () => {
    if (!webId) {
      addTestResult('✗ Not authenticated');
      return;
    }

    try {
      setLoading(true);
      addTestResult('Testing Pod connection...');

      // Test reading WebID document
      const url = webId;
      addTestResult(`Reading WebID document: ${url}`);
      
      const result = await container.solidIo.readTurtle(url);
      
      if (result.ok) {
        addTestResult(`✓ Successfully read WebID document`);
        addTestResult(`  - Triples count: ${result.value.store.size}`);
        addTestResult(`  - ETag: ${result.value.etag ?? 'none'}`);
      } else {
        addTestResult(`✗ Failed to read WebID: ${result.error.message}`);
      }
    } catch (error) {
      addTestResult(`✗ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>FitPod Backend Testing Interface</h1>
      <p style={{ color: '#666' }}>
        Minimal UI for testing Solid Pod integration and layered architecture (L1-L5)
      </p>

      {/* Authentication Section */}
      <div style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '20px' }}>
        <h2>1. Authentication (L5/auth → L2/auth)</h2>
        {webId ? (
          <div>
            <p style={{ color: 'green' }}>✓ Authenticated</p>
            <p><strong>WebID:</strong> {webId}</p>
            <button onClick={handleLogout} disabled={loading}>
              Logout
            </button>
          </div>
        ) : (
          <div>
            <p>Not authenticated</p>
            <label>
              OIDC Issuer:
              <input
                type="text"
                value={oidcIssuer}
                onChange={(e) => setOidcIssuer(e.target.value)}
                style={{ marginLeft: '10px', width: '300px' }}
                disabled={loading}
              />
            </label>
            <br />
            <button onClick={handleLogin} disabled={loading} style={{ marginTop: '10px' }}>
              Login
            </button>
            <p style={{ fontSize: '0.9em', color: '#666' }}>
              Common providers: https://solidcommunity.net, https://inrupt.net, http://localhost:3001/ (CSS)
            </p>
          </div>
        )}
      </div>

      {/* Pod Operations Section */}
      {webId && (
        <>
          <div style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '20px' }}>
            <h2>2. Pod Connection Test (L4/solid-io)</h2>
            <button onClick={testPodConnection} disabled={loading}>
              Test Read WebID Document
            </button>
            <p style={{ fontSize: '0.9em', color: '#666' }}>
              Tests: Turtle parsing, N3.js integration, authenticated fetch
            </p>
          </div>

          <div style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '20px' }}>
            <h2>3. Body Measurements (L3→L4→L5 Full Stack)</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <h3>Add Measurement</h3>
              <label>
                Weight (kg):
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  style={{ marginLeft: '10px', width: '100px' }}
                  disabled={loading}
                />
              </label>
              <br />
              <label>
                Height (cm):
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  style={{ marginLeft: '10px', width: '100px' }}
                  disabled={loading}
                />
              </label>
              <br />
              <button onClick={handleAddMeasurement} disabled={loading} style={{ marginTop: '10px' }}>
                Add Measurement
              </button>
            </div>

            <div>
              <h3>List Measurements</h3>
              <button onClick={handleListMeasurements} disabled={loading}>
                Refresh List
              </button>
              
              {measurements.length > 0 && (
                <table style={{ marginTop: '10px', width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ddd' }}>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Weight (kg)</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Height (cm)</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>BMI</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.map((m) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px' }}>{m.date}</td>
                        <td style={{ padding: '8px' }}>{m.weightKg}</td>
                        <td style={{ padding: '8px' }}>{m.heightCm}</td>
                        <td style={{ padding: '8px' }}>
                          {calculateBMI(m.weightKg, m.heightCm).toFixed(1)}
                        </td>
                        <td style={{ padding: '8px', fontSize: '0.8em', color: '#666' }}>
                          {m.id.substring(0, 8)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Test Results Console */}
      <div style={{ border: '1px solid #ddd', padding: '15px' }}>
        <h2>Test Results Console</h2>
        <button
          onClick={() => setTestResults([])}
          style={{ marginBottom: '10px' }}
        >
          Clear
        </button>
        <div
          style={{
            backgroundColor: '#f5f5f5',
            padding: '10px',
            height: '300px',
            overflowY: 'auto',
            fontSize: '0.9em',
          }}
        >
          {testResults.length === 0 ? (
            <p style={{ color: '#999' }}>No test results yet...</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} style={{ marginBottom: '5px' }}>
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      {loading && (
        <div
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '4px',
          }}
        >
          Loading...
        </div>
      )}
    </div>
  );
};
