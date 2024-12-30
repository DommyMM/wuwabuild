import React from 'react';
import { Character, isRover } from '../../types/character';

interface SequenceSectionProps {
  character: Character;
  isSpectro: boolean;
  currentSequence: number;
}

export const SequenceSection: React.FC<SequenceSectionProps> = ({
  character,
  isSpectro,
  currentSequence
}) => {
  const displayName = isRover(character) ? `Rover${isSpectro ? 'Spectro' : 'Havoc'}` : character.name;

  const elementValue = isRover(character) ? (isSpectro ? "Spectro" : "Havoc") : character.element;

  const elementClass = `element-${elementValue.toLowerCase()}`;

  return (
    <div className="build-sequence-container">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className={`build-sequence-node ${elementClass} ${i <= currentSequence ? 'active' : 'inactive'}`}>
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
              d="m 24.5,6.503 c 9.933,0 17.93,8.13 17.93,18.06 0,9.933 -7.997,17.93 -17.93,17.93 -9.933,0 -18.06,-7.997 -18.06,-17.93 0,-9.933 8.13,-18.06 18.06,-18.06 z" 
              style={{filter: `url(#techGlow-${i})`, opacity: 0.4}}
            />
          
            <g transform="rotate(30, 24.5, 24.5)">
              <path className="spikes" fill="currentColor" style={{opacity: 0.3}} 
                d="M24.5 0.224L21.7 6.125l1.05 0.532C18.55 7.21 14.7 8.88 12.12 11.29l0.49 0.962C15.33 9.64 18.91 7.917 22.89 7.567L24.5 9.52l1.61-1.95c3.983 0.35 7.581 2.083 10.304 4.704l0.497-0.984C34.3 8.88 30.975 7.21 26.775 6.657L28 6.125 24.5 0.224z"
              />
              <path className="accent" fill="currentColor" style={{opacity: 0.3}} 
                d="M41.3 10.15l-3.15 1.4-0.7 2.8 3.15-1.4z"
              />
              <path className="accent" fill="currentColor" style={{opacity: 0.3}} 
                d="M7.35 10.15l0.7 2.8 3.15 1.4-0.7-2.8z"
              />
            </g>
            
            <g transform="rotate(150, 24.5, 24.5)">
              <path className="spikes" fill="currentColor" style={{opacity: 0.3}} 
                d="M24.5 0.224L21.7 6.125l1.05 0.532C18.55 7.21 14.7 8.88 12.12 11.29l0.49 0.962C15.33 9.64 18.91 7.917 22.89 7.567L24.5 9.52l1.61-1.95c3.983 0.35 7.581 2.083 10.304 4.704l0.497-0.984C34.3 8.88 30.975 7.21 26.775 6.657L28 6.125 24.5 0.224z"
              />
              <path className="accent" fill="currentColor" style={{opacity: 0.3}} 
                d="M41.3 10.15l-3.15 1.4-0.7 2.8 3.15-1.4z"
              />
              <path className="accent" fill="currentColor" style={{opacity: 0.3}} 
                d="M7.35 10.15l0.7 2.8 3.15 1.4-0.7-2.8z"
              />
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
              <path id="lock" fill="#ffffff"
                d="M24.56 18.284a3.143 3.143 0 00-3.14 3.14v0.746h-1.21a0.41 0.41 0 00-0.413 0.41v6.79a0.41 0.41 0 00 0.413 0.41h8.582a0.41 0.41 0 00 0.41-0.41v-6.79a0.41 0.41 0 00-0.41-0.41h-1.211v-0.746a3.143 3.143 0 00-3.146-3.14zm0 1.2a2.002 2.002 0 01 2.006 1.999v0.686h-4.011v-0.686a2.002 2.002 0 01 1.999-1.999zm-0.056 4.939a1.113 1.113 0 01 1.106 1.113 1.113 1.113 0 01-0.658 1.012v1.001c0 0.172-0.137 0.301-0.308 0.301h-0.29c-0.172 0-0.308-0.133-0.308-0.301v-1.001a1.113 1.113 0 01-0.658-1.012 1.113 1.113 0 01 1.116-1.113z"
              />
            )}
          </svg>
          <img src={`images/Sequences/T_IconDevice_${displayName}M${i}_UI.png`}
            className="sequence-icon"
            alt={`Sequence ${i}`}
          />
        </div>
      ))}
      <div className='sequence-image'></div>
    </div>
  );
};