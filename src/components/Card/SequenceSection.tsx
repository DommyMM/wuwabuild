import React from 'react';
import { Character } from '../../types/character';

interface SequenceSectionProps {
  character: Character;
  currentSequence: number;
  elementValue: string;
}

export const SequenceSection: React.FC<SequenceSectionProps> = ({
  character,
  currentSequence,
  elementValue
}) => {
  const displayName = character.name;
  const elementClass = `element-${elementValue.toLowerCase()}`;

  return (
    <div className="sequence-display">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className={`sequence-node ${elementClass} ${i <= currentSequence ? '' : 'inactive'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 49 49" className="sequence-medallion">
            <defs>
              <filter id={`techGlow-${i}`} colorInterpolationFilters="sRGB">
                <feGaussianBlur stdDeviation="2.8"/>
                <feComponentTransfer>
                  <feFuncA type="linear" slope="1.5"/>
                </feComponentTransfer>
              </filter>
              <filter id={`sharpGlow-${i}`}>
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.7"/>
                <feOffset dx="0" dy="0" result="offsetblur"/>
                <feComponentTransfer>
                  <feFuncA type="linear" slope="2.5"/>
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path className="blur" fill="currentColor" 
              d="m 24.5,6.503 c 9.933,0 17.93,8.13 17.93,18.06 0,9.933 -7.997,17.93 -17.93,17.93 -9.933,0 -18.06,-7.997 -18.06,-17.93 0,-9.933 8.13,-18.06 18.06,-18.06 z" style={{filter: `url(#techGlow-${i})`, opacity: 0.4}}
            />
            <g className="spike-border">
              <g className="upper-spike">
              <path className="spike-diamond" fill="currentColor"
                  d="M24.5 0.224L21.7 6.125l1.05 0.532L24.5 9.52l1.75-2.863 1.05-0.532L24.5 0.224z"
                />
                <path className="arc" fill="currentColor"
                  d="M 24.5 6.433 L 24.531 6.433 L 22.75 6.657 C 18.55 7.21 14.7 8.88 12.12 11.29 l 0.49 0.962 C 15.33 9.64 18.91 7.917 22.89 7.567 L 24.47 7.442 l 1.62 0.122 c 3.983 0.35 7.581 2.083 10.304 4.704 l 0.497 -0.984 C 34.3 8.88 30.975 7.21 26.775 6.657 L 24.546 6.433 z"
                />
                <path className="accent" fill="currentColor" d="M41.3 10.15l-3.15 1.4-0.7 2.8 3.15-1.4z" />
                <path className="accent" fill="currentColor" d="M7.35 10.15l0.7 2.8 3.15 1.4-0.7-2.8z" />
              </g>
              <g className="lower-spikes">
              <path className="arc" fill="currentColor"
                  d="M 24.5 6.433 L 24.531 6.433 L 22.75 6.657 C 18.55 7.21 14.7 8.88 12.12 11.29 l 0.49 0.962 C 15.33 9.64 18.91 7.917 22.89 7.567 L 24.47 7.442 l 1.62 0.122 c 3.983 0.35 7.581 2.083 10.304 4.704 l 0.497 -0.984 C 34.3 8.88 30.975 7.21 26.775 6.657 L 24.546 6.433 z"
                />
                <path className="spike-diamond" fill="currentColor"
                  d="M24.5 0.224L21.7 6.125l1.05 0.532L24.5 9.52l1.75-2.863 1.05-0.532L24.5 0.224z"
                />
                <path className="accent" fill="currentColor" d="M41.3 10.15l-3.15 1.4-0.7 2.8 3.15-1.4z" />
                <path className="accent" fill="currentColor" d="M7.35 10.15l0.7 2.8 3.15 1.4-0.7-2.8z" />
              </g>
            </g>
            <path className="backdrop" fill="currentColor" 
              d="M24.5 10.917c7.497 0 13.534 6.135 13.534 13.632 0 7.497-6.037 13.534-13.534 13.534-7.497 0-13.632-6.037-13.632-13.534 0-7.497 6.135-13.632 13.632-13.632z"
            />
            <path className="backdropDark" fill="rgba(0,0,0,0.85)" style={{filter: "brightness(0.15)"}}
              d="M24.5 10.917c7.497 0 13.534 6.135 13.534 13.632 0 7.497-6.037 13.534-13.534 13.534-7.497 0-13.632-6.037-13.632-13.534 0-7.497 6.135-13.632 13.632-13.632z"
            />
            <path className="outerRing" fill="currentColor" style={{opacity: 0.95}}
              d="M24.5 8.757c-8.662 0-15.694 7.13-15.694 15.792 0 8.662 7.035 15.694 15.694 15.694 8.662 0 15.694-7.035 15.694-15.694 0-8.662-7.035-15.792-15.694-15.792zm0 2.583c7.294 0 13.111 5.915 13.111 13.209 0 7.294-5.817 13.111-13.111 13.111-7.294 0-13.209-5.817-13.209-13.111 0-7.294 5.915-13.209 13.209-13.209z"
            />
            <path className="innerRing" fill="currentColor" style={{filter: `url(#sharpGlow-${i})`}}
              d="M24.5 10.384c-7.78 0-14.164 6.384-14.164 14.164 0 7.78 6.384 14.07 14.164 14.07 7.78 0 14.07-6.29 14.07-14.07 0-7.78-6.29-14.164-14.07-14.164zm0 0.955c7.262 0 13.111 5.943 13.111 13.209 0 7.262-5.849 13.111-13.111 13.111-7.262 0-13.209-5.849-13.209-13.111 0-7.262 5.943-13.209 13.209-13.209z"
            />
            {i > currentSequence && (
              <g className='lock' transform="translate(14.25, 12) scale(0.5)">
                <path className="lock-top" fill="currentColor" transform="translate(-1.23, 1)" d="M17.3 17v-2.5c0-2.7 2.2-4.8 4.8-4.8s4.8 2.2 4.8 4.8v2.5c0.7 0.3 1.3 0.6 2 1v-3.5c0-3.8-3.1-6.8-6.8-6.8s-6.8 3.1-6.8 6.8v3.5c0.7-0.4 1.3-0.7 2-1z" />
                <path className="lock-body" fill="currentColor" d="M20.8 18c-5.8 0-10.5 4.7-10.5 10.5S15 39 20.8 39s10.5-4.7 10.5-10.5S26.6 18 20.8 18z" />
                <path className="lock-key" fill="currentColor" d="M21.8 29v3.6h-2v-3.6c-0.8-0.4-1.3-1.2-1.3-2.1c0-1.3 1-2.3 2.3-2.3s2.3 1 2.3 2.3c0 0.9-0.5 1.7-1.3 2.1z" />
              </g>
            )}
          </svg>
          <img src={`/images/Sequences/T_IconDevice_${displayName}M${i}_UI.png`} 
            className="sequence-icon" 
            alt={`Sequence ${i}`}
          />
        </div>
      ))}
      <div className='sequence-count'> S{currentSequence}</div>
      <div className='sequence-image'></div>
    </div>
  );
};