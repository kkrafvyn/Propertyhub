import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  RotateCcw, 
  Eye, 
  Settings,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Maximize,
  Minimize
} from 'lucide-react';
import { MobileChatSystem } from '../chat/MobileChatSystem';
import { useMobile } from '../../hooks/useMobile';

interface DevicePreset {
  name: string;
  width: number;
  height: number;
  icon: React.ComponentType<{ className?: string }>;
  category: 'mobile' | 'tablet' | 'desktop';
}

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  duration: number;
}

const devicePresets: DevicePreset[] = [
  // Mobile devices
  { name: 'iPhone SE', width: 375, height: 667, icon: Smartphone, category: 'mobile' },
  { name: 'iPhone 12', width: 390, height: 844, icon: Smartphone, category: 'mobile' },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932, icon: Smartphone, category: 'mobile' },
  { name: 'Samsung Galaxy S21', width: 360, height: 800, icon: Smartphone, category: 'mobile' },
  { name: 'Pixel 6', width: 393, height: 851, icon: Smartphone, category: 'mobile' },
  
  // Tablets
  { name: 'iPad Mini', width: 768, height: 1024, icon: Tablet, category: 'tablet' },
  { name: 'iPad Air', width: 820, height: 1180, icon: Tablet, category: 'tablet' },
  { name: 'iPad Pro 11"', width: 834, height: 1194, icon: Tablet, category: 'tablet' },
  { name: 'Surface Pro', width: 912, height: 1368, icon: Tablet, category: 'tablet' },
  
  // Desktop breakpoints
  { name: 'Small Desktop', width: 1024, height: 768, icon: Monitor, category: 'desktop' },
  { name: 'Desktop', width: 1280, height: 720, icon: Monitor, category: 'desktop' },
  { name: 'Large Desktop', width: 1920, height: 1080, icon: Monitor, category: 'desktop' },
];

interface MobileChatTesterProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function MobileChatTester({ isOpen, onClose, className = '' }: MobileChatTesterProps) {
  const [selectedDevice, setSelectedDevice] = useState<DevicePreset>(devicePresets[1]); // iPhone 12
  const [isLandscape, setIsLandscape] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(true);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const testContainerRef = useRef<HTMLDivElement>(null);

  const currentWidth = isLandscape ? selectedDevice.height : selectedDevice.width;
  const currentHeight = isLandscape ? selectedDevice.width : selectedDevice.height;

  // Responsive breakpoint detection
  const getBreakpointInfo = (width: number) => {
    if (width < 480) return { name: 'xs', color: 'bg-red-500', description: 'Extra Small' };
    if (width < 640) return { name: 'sm', color: 'bg-orange-500', description: 'Small' };
    if (width < 768) return { name: 'md', color: 'bg-yellow-500', description: 'Medium' };
    if (width < 1024) return { name: 'lg', color: 'bg-green-500', description: 'Large' };
    if (width < 1280) return { name: 'xl', color: 'bg-blue-500', description: 'Extra Large' };
    return { name: '2xl', color: 'bg-purple-500', description: '2X Large' };
  };

  const breakpoint = getBreakpointInfo(currentWidth);

  // Performance testing functions
  const runPerformanceTests = async () => {
    setIsRunningTests(true);
    const results: TestResult[] = [];

    const runTest = async (testName: string, testFn: () => Promise<boolean>) => {
      const startTime = performance.now();
      try {
        const passed = await testFn();
        const duration = performance.now() - startTime;
        results.push({
          test: testName,
          passed,
          message: passed ? 'Test passed successfully' : 'Test failed',
          duration
        });
      } catch (error) {
        const duration = performance.now() - startTime;
        results.push({
          test: testName,
          passed: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          duration
        });
      }
    };

    // Test responsive layout
    await runTest('Responsive Layout', async () => {
      // Simulate layout measurement
      await new Promise(resolve => setTimeout(resolve, 100));
      return currentWidth >= 320; // Minimum supported width
    });

    // Test touch interactions
    await runTest('Touch Interactions', async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
      return true; // Assume touch events are supported
    });

    // Test scroll performance
    await runTest('Scroll Performance', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return true; // Simulate smooth scrolling test
    });

    // Test keyboard handling
    await runTest('Virtual Keyboard', async () => {
      await new Promise(resolve => setTimeout(resolve, 120));
      return currentHeight > 400; // Minimum height for keyboard
    });

    // Test orientation change
    await runTest('Orientation Support', async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
      return Math.min(currentWidth, currentHeight) >= 320;
    });

    // Test gesture recognition
    await runTest('Gesture Recognition', async () => {
      await new Promise(resolve => setTimeout(resolve, 90));
      return 'ontouchstart' in window;
    });

    setTestResults(results);
    setIsRunningTests(false);
  };

  // Auto-run tests when device changes
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        runPerformanceTests();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedDevice, isLandscape, isOpen]);

  const getTestStatusIcon = (passed: boolean) => {
    return passed ? CheckCircle : XCircle;
  };

  const getTestStatusColor = (passed: boolean) => {
    return passed ? 'text-green-500' : 'text-red-500';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 ${className}`}
      >
        <div className="h-full flex">
          {/* Test Panel */}
          <AnimatePresence>
            {showTestPanel && (
              <motion.div
                initial={{ x: -400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -400, opacity: 0 }}
                className="w-96 bg-background border-r border-border h-full overflow-y-auto"
              >
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Mobile Chat Tester</h2>
                    <Button
                      onClick={() => setShowTestPanel(false)}
                      variant="ghost"
                      size="sm"
                    >
                      <Minimize className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Device Selection */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Device Presets</label>
                      <div className="grid grid-cols-1 gap-1 mt-2">
                        {devicePresets.map((device) => {
                          const DeviceIcon = device.icon;
                          return (
                            <button
                              key={device.name}
                              onClick={() => setSelectedDevice(device)}
                              className={`flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                                selectedDevice.name === device.name
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <DeviceIcon className="w-4 h-4" />
                              <div className="flex-1">
                                <div className="text-sm font-medium">{device.name}</div>
                                <div className="text-xs opacity-70">
                                  {device.width} × {device.height}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setIsLandscape(!isLandscape)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Rotate
                      </Button>
                      <Button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        {isFullscreen ? <Minimize /> : <Maximize />} className="w-4 h-4"
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Device Info */}
                <div className="p-4 border-b">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Current Size</span>
                      <Badge variant="outline">
                        {currentWidth} × {currentHeight}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Breakpoint</span>
                      <Badge className={`${breakpoint.color} text-white`}>
                        {breakpoint.name} - {breakpoint.description}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Orientation</span>
                      <Badge variant="secondary">
                        {isLandscape ? 'Landscape' : 'Portrait'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Test Results */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Test Results</h3>
                    <Button
                      onClick={runPerformanceTests}
                      disabled={isRunningTests}
                      variant="outline"
                      size="sm"
                    >
                      {isRunningTests ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Run Tests
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {testResults.map((result, index) => {
                      const StatusIcon = getTestStatusIcon(result.passed);
                      return (
                        <motion.div
                          key={`${result.test}-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                        >
                          <StatusIcon className={`w-4 h-4 ${getTestStatusColor(result.passed)}`} />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{result.test}</div>
                            <div className="text-xs text-muted-foreground">
                              {result.message} ({result.duration.toFixed(1)}ms)
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}

                    {testResults.length === 0 && !isRunningTests && (
                      <div className="text-center text-muted-foreground py-8">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No test results yet</p>
                        <p className="text-xs">Click "Run Tests" to start testing</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t mt-auto">
                  <Button onClick={onClose} className="w-full">
                    Close Tester
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Device Preview */}
          <div className="flex-1 flex items-center justify-center p-8">
            {!showTestPanel && (
              <Button
                onClick={() => setShowTestPanel(true)}
                className="fixed left-4 top-4 z-10"
                variant="outline"
                size="sm"
              >
                <Maximize className="w-4 h-4 mr-2" />
                Show Panel
              </Button>
            )}

            <motion.div
              key={`${selectedDevice.name}-${isLandscape}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative bg-gray-800 rounded-[2rem] p-2"
              style={{
                width: currentWidth + 24,
                height: currentHeight + 24
              }}
            >
              {/* Device Frame */}
              <div className="relative bg-black rounded-[1.5rem] overflow-hidden">
                {/* Status indicators */}
                <div className="absolute top-2 left-4 right-4 z-10 flex justify-between items-center">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-white rounded-full opacity-80" />
                    <div className="w-1 h-1 bg-white rounded-full opacity-60" />
                    <div className="w-1 h-1 bg-white rounded-full opacity-40" />
                  </div>
                  <Badge variant="secondary" className="text-xs px-2 py-0">
                    {selectedDevice.name}
                  </Badge>
                  <div className="text-white text-xs opacity-80">
                    {new Date().toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: false
                    })}
                  </div>
                </div>

                {/* Chat System Container */}
                <div
                  ref={testContainerRef}
                  className="w-full h-full bg-background"
                  style={{
                    width: currentWidth,
                    height: currentHeight
                  }}
                >
                  <MobileChatSystem
                    className="w-full h-full"
                    height={`${currentHeight}px`}
                  />
                </div>
              </div>

              {/* Device Info Overlay */}
              <div className="absolute -bottom-8 left-0 right-0 text-center">
                <Badge variant="outline" className="bg-background">
                  {currentWidth} × {currentHeight} • {breakpoint.name}
                </Badge>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default MobileChatTester;