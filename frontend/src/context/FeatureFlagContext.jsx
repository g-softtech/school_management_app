import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

// ─── 1. Create the Context ───────────────────────────────────────────────────
const FeatureFlagContext = createContext({
  features: [],
  isLoading: true,
  error: null,
});

// ─── 2. The Provider Component ───────────────────────────────────────────────
export const FeatureFlagProvider = ({ children }) => {
  const [features, setFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchFeatures = async () => {
      try {
        setIsLoading(true);
        // We ping the user's current context or a dedicated settings endpoint
        // to retrieve the active SchoolSettings for this tenant.
        // E.g., The backend returns: { success: true, data: { activeFeatures: ['feature_finance', ...] } }
        // Fallback gracefully if the backend isn't mapped yet.
        const response = await api.get('/auth/me'); 
        
        if (isMounted) {
          // If the backend injects the active feature list into the user payload
          if (response.data?.data?.tenant?.activeFeatures) {
            setFeatures(response.data.data.tenant.activeFeatures);
          } else {
            // Safe fallback if the backend payload shape differs
            setFeatures([]);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('[FeatureFlagProvider] Failed to fetch active feature modules:', err);
          setError(err);
          // Security Fallback: Block all gated modules if we cannot verify subscription tier
          setFeatures([]); 
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Only fetch features if we are genuinely on a tenant subdomain (not the root landing page)
    const currentTenant = api.defaults.headers['X-Tenant-ID'] || localStorage.getItem('dev_tenant_id');
    // Or if we know we have a token (since flags only apply inside the app dashboard)
    const hasToken = !!localStorage.getItem('token');
    
    if (hasToken) {
      fetchFeatures();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <FeatureFlagContext.Provider value={{ features, isLoading, error }}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

// ─── 3. The Custom Hook: useFeature ──────────────────────────────────────────
/**
 * Hook to programmatically check if a feature flag is active.
 * 
 * @param {string} featureKey - The backend key (e.g., 'feature_finance')
 * @returns {boolean} - True if active, false otherwise.
 */
export const useFeature = (featureKey) => {
  const { features, isLoading } = useContext(FeatureFlagContext);
  
  if (isLoading) {
    // Optionally return false immediately to prevent flash-of-unauthorized-content
    return false;
  }
  
  return features.includes(featureKey);
};

// ─── 4. The Structural Helper Component: FeatureGate ─────────────────────────
/**
 * A wrapper component that conditionally renders its children based on the tenant's subscription tier.
 * 
 * @param {Object} props
 * @param {string} props.flag - The module flag (e.g., 'feature_attendance')
 * @param {React.ReactNode} [props.fallback] - Elegant UI to display if locked (e.g., Blurred "Upgrade" Card)
 * @param {React.ReactNode} props.children - The actual module UI to render if unlocked
 */
export const FeatureGate = ({ flag, fallback = null, children }) => {
  const { features, isLoading } = useContext(FeatureFlagContext);

  // While checking the server, we render nothing to prevent UI flickering
  if (isLoading) {
    return null; 
  }

  const isUnlocked = features.includes(flag);

  if (isUnlocked) {
    return <>{children}</>;
  }

  // If the module is locked, show the beautiful fallback UI or nothing at all
  if (fallback) {
    return <>{fallback}</>;
  }

  return null;
};
