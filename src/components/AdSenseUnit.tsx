
'use client';

import React, { useEffect } from 'react';

interface AdSenseUnitProps {
  adClient: string;
  adSlot: string;
  adFormat?: string;
  fullWidthResponsive?: boolean;
  style?: React.CSSProperties;
  className?: string;
  layout?: string;
  layoutKey?: string;
}

const AdSenseUnit: React.FC<AdSenseUnitProps> = ({
  adClient,
  adSlot,
  adFormat = 'auto',
  fullWidthResponsive = true,
  style = { display: 'block' },
  className = '',
  layout,
  layoutKey,
}) => {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error('AdSense push error:', e);
    }
  }, [adClient, adSlot]); // Re-run if adClient or adSlot changes, though typically they won't for a specific unit

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={String(fullWidthResponsive)}
        data-ad-layout={layout}
        data-ad-layout-key={layoutKey}
      />
    </div>
  );
};

export default AdSenseUnit;
