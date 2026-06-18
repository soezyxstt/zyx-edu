'use client';

import React from 'react';
import { motion } from 'motion/react';

export default function RouteTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Root Layer: Manages structural layout and handles the final cleanup display switch */}
      <motion.div
        key="route-loader-layer"
        className="fixed inset-0 z-99999 flex items-center justify-center pointer-events-none"
        initial={{ display: 'flex'}}
        animate={{ transitionEnd: { display: 'none' } }}
        transition={{ delay: 2.0 }} // Keeps the layer alive until the logo fully finishes
      >
        {/* DECOUPLED BACKGROUND LAYER: Fades early.
          It fades out completely at 1.2s, while the logo text gradients are finishing up.
        */}
        <motion.div 
          className="absolute inset-0 bg-background pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: 'linear', delay: 0.3 }} // Starts fading at 0.7s, gone by 1.2s
        />

        {/* LOGO WRAPPER CONTAINER: 
          Stays fully opaque while drawing, then fades out cleanly at the very end.
        */}
        <motion.div 
          className="w-[180px] h-[180px] md:w-[220px] md:h-[220px] rounded-full flex items-center justify-center bg-transparent shadow-sm relative z-10"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.3 }} // Fades out the logo elements at 1.8s
        >
          <div className="w-[70%] h-[70%] relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 2182 1275"
              fill="none"
              className="w-full h-full"
            >
              <defs>
                <linearGradient id="tmpl-reveal-z" x1="0" y1="0" x2="1" y2="0">
                  <motion.stop 
                    offset="0%" 
                    stopColor="var(--color-marketing-navy, #2A3C6A)"
                    className="dark:[stop-color:#FFF]"
                    initial={{ offset: "0%" }}
                    animate={{ offset: "100%" }}
                    transition={{ duration: 0.8, ease: "easeInOut", delay: 0.1 }}
                  />
                  <motion.stop 
                    offset="0%" 
                    stopColor="transparent" 
                    initial={{ offset: "0%" }}
                    animate={{ offset: "100%" }}
                    transition={{ duration: 0.8, ease: "easeInOut", delay: 0.1 }}
                  />
                </linearGradient>

                <linearGradient id="tmpl-reveal-x" x1="0" y1="0" x2="1" y2="0">
                  <motion.stop 
                    offset="0%" 
                    stopColor="var(--color-zx-accent, #CC542B)" 
                    className="dark:[stop-color:#FFF]"
                    initial={{ offset: "0%" }}
                    animate={{ offset: "100%" }}
                    transition={{ duration: 0.8, ease: "easeInOut", delay: 0.4 }}
                  />
                  <motion.stop 
                    offset="0%" 
                    stopColor="transparent" 
                    initial={{ offset: "0%" }}
                    animate={{ offset: "100%" }}
                    transition={{ duration: 0.8, ease: "easeInOut", delay: 0.4 }}
                  />
                </linearGradient>
              </defs>

              <path
                d="M820.486 0L1043.32 311.527L561.052 985.764H785.07C1218.92 985.764 1414.6 741.149 1490.45 548.958C1530.06 448.611 1614.41 218.403 1779.69 153.473C1726.56 188.889 1645.61 253.821 1596.7 619.792C1511.51 1257.29 1018.23 1275 675.869 1275H0L705.095 289.236H0V0H820.486Z"
                fill="url(#tmpl-reveal-z)"
              />

              <path
                d="M1548 389.927L1826.91 0H2181.08L1725.09 637.5L2181.08 1275H1826.91L1584.83 936.551C1624.06 852.061 1646.88 746.292 1646.88 613.889C1646.88 330.556 1729.52 188.89 1782.64 153.473C1617.37 218.403 1594.99 445.66 1555.38 546.007C1531.12 607.48 1494.6 674.317 1441.95 736.797L914.931 0H1269.1L1548 389.927Z"
                fill="url(#tmpl-reveal-x)"
              />
            </svg>
          </div>
        </motion.div>
      </motion.div>

      {children}
    </>
  );
}