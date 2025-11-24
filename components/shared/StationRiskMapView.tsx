
import React from 'react';
import { Station, RiskCategory } from '../../types';

interface StationRiskMapViewProps {
    stations: Station[];
}

const getRiskColor = (risk: RiskCategory): string => {
    switch (risk) {
        case RiskCategory.High: return 'bg-red-500';
        case RiskCategory.Medium: return 'bg-amber-500';
        case RiskCategory.Low: return 'bg-green-500';
        default: return 'bg-slate-400';
    }
};

// Simple hashing function to get a somewhat consistent position for demo purposes
const getPosition = (stationId: string): { top: string; left: string } => {
    let hash = 0;
    for (let i = 0; i < stationId.length; i++) {
        const char = stationId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    const top = (Math.abs(hash * 13) % 70) + 15; // Range 15-85
    const left = (Math.abs(hash * 29) % 80) + 10; // Range 10-90
    return { top: `${top}%`, left: `${left}%` };
};

const StationRiskMapView: React.FC<StationRiskMapViewProps> = ({ stations }) => {
    return (
        <div>
            <div className="relative w-full h-48 bg-slate-200 rounded-lg overflow-hidden border border-slate-300">
                {/* Placeholder for map background image */}
                <svg width="100%" height="100%" className="absolute inset-0">
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(203, 213, 225, 0.5)" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
                <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg opacity-60">
                    [Regional Map Placeholder]
                </p>
                {stations.map((station) => {
                    const position = getPosition(station.id);
                    return (
                        <div
                            key={station.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                            style={{ top: position.top, left: position.left }}
                        >
                             <div className={`w-3 h-3 rounded-full border-2 border-white shadow-md ${getRiskColor(station.riskCategory)} transition-transform group-hover:scale-125`}></div>
                             <div className="absolute bottom-full mb-3 w-max max-w-xs p-2 text-xs text-white bg-slate-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -translate-x-1/2 left-1/2">
                                <p className="font-bold">{station.name}</p>
                                <p>Risk Level: {station.riskCategory}</p>
                                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-around mt-2 text-xs text-slate-600">
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-green-500 mr-1.5"></span>Low Risk</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1.5"></span>Medium Risk</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5"></span>High Risk</span>
            </div>
        </div>
    );
};

export default StationRiskMapView;
