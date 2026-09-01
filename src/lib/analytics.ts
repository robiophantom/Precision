// A basic analytics abstraction that can be plugged into PostHog, Vercel Web Analytics, or Mixpanel later.

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[Analytics] Track: ${eventName}`, properties || {});
    return;
  }
  // TODO: Add actual production analytics integration here.
};
