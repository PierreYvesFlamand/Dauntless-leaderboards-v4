import { Injectable } from '@angular/core';
import pako from 'pako'

import { ALL_DATA, DAUNTLESS_GAUNTLET_SEASON, GAUNTLET_SEASON_LEADERBOARD_ITEM } from '../../../../scripts/src/types/types';

export type WEBSITE_GAUNTLET = {
    allGauntletsInfo: GAUNTLET_INFO[]
    gauntletInfo: GAUNTLET_INFO
    gauntletLeaderboard: GAUNTLET_LEADERBOARD[]
}

type GAUNTLET_INFO = {
    season: number
    startAt: Date
    endAt: Date
    lastUpdated: Date
}

type GAUNTLET_LEADERBOARD = {
    rank: number
    guildId: number
    guildIconFilename: string | null
    guildName: string
    guildTag: string
    level: number
    remainingSec: number
}

export type WEBSITE_GUILD = {
    id: number
    iconFilename: string | null
    name: string
    tag: string
    rating: number
    nbrTop1: number
    nbrTop5: number
    nbrTop20: number
    nbrTop100: number
    totalLevelCleared: number
    discordLink: string | null
    detailHtml: string | null
    guildGauntletStats: GUILD_GAUNTLET_STAT_ITEM[]
}

type GUILD_GAUNTLET_STAT_ITEM = {
    season: number
    rank: number
}

export type WEBSITE_DASHBOARD = {
    currentGauntletInfo: GAUNTLET_INFO
    currentGauntletLeaderboard: GAUNTLET_LEADERBOARD[]
}

@Injectable({
    providedIn: 'root'
})
export class DatabaseService {
    public data = {
        loaded: false,
        gauntlets: [],
        guilds: []
    } as {
        loaded: boolean
        dashboard?: WEBSITE_DASHBOARD
        gauntlets: WEBSITE_GAUNTLET[]
        guilds: WEBSITE_GUILD[]
    };

    public async loadData() {
        console.time('Data fetching');

        const res = await fetch('data/allData.json.compressed');
        const arrayBuffer = await res.arrayBuffer();
        const allData = JSON.parse(pako.inflate(new Uint8Array(arrayBuffer), { to: 'string' })) as ALL_DATA;

        try {
            const res = await fetch(`https://storage.googleapis.com/dauntless-gauntlet-leaderboard/production-gauntlet-season${String(allData.gauntlets.length).padStart(2, '0')}.json?_=${new Date()}`);
            const dauntlessData = await res.json() as DAUNTLESS_GAUNTLET_SEASON;

            allData.gauntlets[allData.gauntlets.length - 1].lastUpdated = dauntlessData.last_updated;
            allData.gauntlets[allData.gauntlets.length - 1].leaderboard = dauntlessData.leaderboard.reduce((arr: GAUNTLET_SEASON_LEADERBOARD_ITEM[], item, index): GAUNTLET_SEASON_LEADERBOARD_ITEM[] => {
                return [
                    ...arr,
                    {
                        guildId: allData.guilds.find(g => g.name === item.guild_name && g.tag === item.guild_nameplate)?.id || 0,
                        guildNameTag: `${item.guild_name}|||${item.guild_nameplate}`,
                        rank: index + 1,
                        level: item.level,
                        remainingSec: item.remaining_sec
                    }
                ]
            }, []);

        } catch (error) { }

        console.timeEnd('Data fetching');
        console.time('Data formating');

        // Guilds
        this.data.guilds = allData.guilds.reduce((arr: WEBSITE_GUILD[], item): WEBSITE_GUILD[] => {
            return [
                ...arr,
                {
                    id: item.id,
                    iconFilename: null,
                    name: item.name,
                    tag: item.tag,
                    rating: 0,
                    nbrTop1: 0,
                    nbrTop5: 0,
                    nbrTop20: 0,
                    nbrTop100: 0,
                    totalLevelCleared: 0,
                    discordLink: null,
                    detailHtml: null,
                    guildGauntletStats: []
                }
            ]
        }, []);

        for (const guildData of allData.guildsData) {
            this.data.guilds[guildData.guildId - 1].iconFilename = guildData.iconFilename
            this.data.guilds[guildData.guildId - 1].discordLink = guildData.discordLink
            this.data.guilds[guildData.guildId - 1].detailHtml = guildData.detailHtml
        }

        // Gauntlets
        this.data.gauntlets = allData.gauntlets.reduce((arr: WEBSITE_GAUNTLET[], item, index): WEBSITE_GAUNTLET[] => {
            return [
                ...arr,
                {
                    allGauntletsInfo: allData.gauntlets.reduce((arr: GAUNTLET_INFO[], item, index): GAUNTLET_INFO[] => {
                        return [
                            ...arr,
                            {
                                season: index + 1,
                                startAt: item.startAt,
                                endAt: item.endAt,
                                lastUpdated: item.lastUpdated
                            }
                        ]
                    }, []),
                    gauntletInfo: {
                        season: index + 1,
                        startAt: item.startAt,
                        endAt: item.endAt,
                        lastUpdated: item.lastUpdated
                    },
                    gauntletLeaderboard: item.leaderboard.reduce((arr: GAUNTLET_LEADERBOARD[], item): GAUNTLET_LEADERBOARD[] => {
                        if (item.guildId) {
                            this.data.guilds[item.guildId - 1].totalLevelCleared += item.level;
                            this.data.guilds[item.guildId - 1].guildGauntletStats.push({
                                season: index + 1,
                                rank: item.rank
                            });
                        }

                        return [
                            ...arr,
                            {
                                rank: item.rank,
                                guildId: item.guildId,
                                guildIconFilename: item.guildId ? this.data.guilds[item.guildId - 1].iconFilename : null,
                                guildName: item.guildId ? this.data.guilds[item.guildId - 1].name : (item.guildNameTag?.split('|||')[0] || ''),
                                guildTag: item.guildId ? this.data.guilds[item.guildId - 1].tag : (item.guildNameTag?.split('|||')[1] || ''),
                                level: item.level,
                                remainingSec: item.remainingSec
                            }
                        ]
                    }, [])
                }
            ]
        }, []);

        // Guilds rating
        const alpha = 1.1; // Rapid decay factor to focus on the last two seasons
        const inactivityPenalty = 30; // Penalty for recent inactivity

        let perfectRawRating = 0;
        for (let i = 1; i <= allData.gauntlets.length; i++) {
            const weight = Math.exp(-alpha * (allData.gauntlets.length - i));
            perfectRawRating += Math.floor(100 * weight);
        }

        for (const guild of this.data.guilds) {
            guild.nbrTop1 = guild.guildGauntletStats.filter(gs => gs.rank <= 1).length;
            guild.nbrTop5 = guild.guildGauntletStats.filter(gs => gs.rank <= 5).length;
            guild.nbrTop20 = guild.guildGauntletStats.filter(gs => gs.rank <= 20).length;
            guild.nbrTop100 = guild.guildGauntletStats.filter(gs => gs.rank <= 100).length;

            let guildRawRating = 0;
            let recentSeasons = [false, false]; // Track participation in the last two seasons

            for (const gs of guild.guildGauntletStats) {
                const weight = Math.exp(-alpha * (allData.gauntlets.length - gs.season));
                guildRawRating += Math.floor((100 - gs.rank + 1) * weight);

                // Check participation in the last two seasons
                if (gs.season === allData.gauntlets.length) recentSeasons[0] = true;
                if (gs.season === allData.gauntlets.length - 1) recentSeasons[1] = true;
            }

            // Apply penalty if the guild did not participate in one or both of the last two seasons
            const penalty = recentSeasons.includes(false) ? inactivityPenalty : 0;

            // Final rating calculation, ensuring it doesn't go below zero
            guild.rating = Math.max(0, (100 / perfectRawRating * guildRawRating) - penalty);
        }

        // Dashboard
        this.data.dashboard = {
            currentGauntletInfo: this.data.gauntlets[this.data.gauntlets.length - 1].gauntletInfo,
            currentGauntletLeaderboard: this.data.gauntlets[this.data.gauntlets.length - 1].gauntletLeaderboard.slice(0, 10)
        }

        // Done
        this.data.loaded = true;
        console.timeEnd('Data formating');
    }
}