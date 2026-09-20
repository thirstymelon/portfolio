export interface Project {
    slug: string;
    tab: string;
    nav_title: string;
    card_label: string;
    repo: string;
    title: string;
    og_title: string;
    description: string;
}

export const PROJECT_ORDER = ['glyph', 'meshos', 'radiokit'] as const;
export type ProjectSlug = typeof PROJECT_ORDER[number];

export const PROJECTS: Record<ProjectSlug, Project> = {
    glyph: {
        slug: 'glyph',
        tab: '✦ Glyph',
        nav_title: 'Glyph Graphics Library',
        card_label: '✦ Glyph Graphics Framework',
        repo: 'https://github.com/thirstymelon/glyph',
        title: 'Glyph — Building a Portable Graphics Framework for Bare-Metal Ada | Lokesh Panditi',
        og_title: 'Glyph — Building a Portable Graphics Framework for Bare-Metal Ada',
        description: 'Technical deep dive into Glyph, a lightweight, portable graphics framework written in Ada 2022 for bare-metal and embedded systems like the RP2040 and SSD1306 OLED.',
    },
    meshos: {
        slug: 'meshos',
        tab: '⚡ MeshOS',
        nav_title: 'MeshOS ESP-NOW Network',
        card_label: '⚡ MeshOS Mesh Network',
        repo: 'https://github.com/thirstymelon/esp32Mesh',
        title: 'MeshOS — Building an Offline, Encrypted Communication Network with ESP32 | Lokesh Panditi',
        og_title: 'MeshOS — Building an Offline, Encrypted Communication Network with ESP32',
        description: 'Technical deep dive into MeshOS, an offline, encrypted peer-to-peer multi-hop mesh communication network using ESP32, ESP-NOW, and native iOS/macOS SwiftUI companion apps.',
    },
    radiokit: {
        slug: 'radiokit',
        tab: '∿ Radio_Kit',
        nav_title: 'Radio_Kit RF Synthesizer',
        card_label: '∿ Radio_Kit Framework',
        repo: 'https://github.com/thirstymelon/Radio_Kit',
        title: 'Radio_Kit — Turning an RP2040\'s Clock Tree into an Experimental RF Source | Lokesh Panditi',
        og_title: 'Radio_Kit — Turning an RP2040\'s Clock Tree into an Experimental RF Source',
        description: 'Technical deep dive into Radio_Kit, an experimental Ada framework for the RP2040 that generates programmable 6 Hz to 90 MHz digital RF carriers directly from on-chip clock dividers.',
    },
};

export function getProjectPager(slug: ProjectSlug) {
    const index = PROJECT_ORDER.indexOf(slug);
    const prevIndex = (index - 1 + PROJECT_ORDER.length) % PROJECT_ORDER.length;
    const nextIndex = (index + 1) % PROJECT_ORDER.length;
    return {
        prev: PROJECTS[PROJECT_ORDER[prevIndex]],
        next: PROJECTS[PROJECT_ORDER[nextIndex]],
    };
}
