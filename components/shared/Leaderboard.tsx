
import React, { useMemo } from 'react';
import { Station, ChecklistSubmission, ChecklistStatus } from '../../types';
import Card from './Card';

interface LeaderboardProps {
    title: string;
    stations: Station[];
    submissions: ChecklistSubmission[];
    currentUserStationId?: string; // To highlight the current user's station
}

const getProgressBarColor = (percentage: number) => {
    if (percentage < 80) return 'bg-red-500';
    if (percentage < 95) return 'bg-amber-500';
    return 'bg-green-500';
};

const Leaderboard: React.FC<LeaderboardProps> = ({ title, stations, submissions, currentUserStationId }) => {
    const rankedStations = useMemo(() => {
        const stationScores = stations.map(station => {
            const stationSubmissions = submissions.filter(s => s.stationId === station.id);
            if (stationSubmissions.length === 0) {
                return { station, compliance: 100 };
            }

            let compliantCount = 0;
            let totalCount = 0;
            stationSubmissions.forEach(submission => {
                // FIX: Property 'items' does not exist on type 'ChecklistSubmission'. Use 'data' instead.
                Object.values(submission.data).forEach(status => {
                    // Ensure we only count actual status strings, ignoring things like { submit: true }
                    if (typeof status === 'string' && status !== ChecklistStatus.NA) {
                        totalCount++;
                        if (status === ChecklistStatus.Compliant) {
                            compliantCount++;
                        }
                    }
                });
            });

            const compliance = totalCount > 0 ? (compliantCount / totalCount) * 100 : 100;
            return { station, compliance };
        });

        return stationScores.sort((a, b) => b.compliance - a.compliance);
    }, [stations, submissions]);

    return (
        <Card title={title}>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {rankedStations.map((item, index) => {
                    const isCurrentUserStation = item.station.id === currentUserStationId;
                    return (
                        <div key={item.station.id} className={`p-3 rounded-lg ${isCurrentUserStation ? 'bg-emerald-50 border-2 border-emerald-400' : 'bg-slate-50'}`}>
                            <div className="flex items-center space-x-4">
                                <span className={`text-lg font-bold w-8 text-center ${index < 3 ? 'text-emerald-600' : 'text-slate-500'}`}>
                                    #{index + 1}
                                </span>
                                <div className="flex-1">
                                    <p className={`font-semibold ${isCurrentUserStation ? 'text-emerald-800' : 'text-slate-800'}`}>
                                        {item.station.name}
                                        {isCurrentUserStation && <span className="ml-2 text-xs font-normal">(Your Station)</span>}
                                    </p>
                                    <p className="text-xs text-slate-500">{item.station.region}</p>
                                </div>
                                <span className="text-lg font-bold text-slate-700 w-20 text-right">{item.compliance.toFixed(1)}%</span>
                            </div>
                            <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                                <div
                                    className={`${getProgressBarColor(item.compliance)} h-2 rounded-full`}
                                    style={{ width: `${item.compliance}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

export default Leaderboard;
