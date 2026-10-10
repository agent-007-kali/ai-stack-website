import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'AI Solutions - we make your business agent-ready';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
    const [sol, ana, tally] = await Promise.all([
        readFile(join(process.cwd(), 'public/lobby/sol.png')).then((b) => `data:image/png;base64,${b.toString('base64')}`),
        readFile(join(process.cwd(), 'public/lobby/ana.jpg')).then((b) => `data:image/jpeg;base64,${b.toString('base64')}`),
        readFile(join(process.cwd(), 'public/lobby/tally.jpg')).then((b) => `data:image/jpeg;base64,${b.toString('base64')}`),
    ]);

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, #070b1f 0%, #121a3f 55%, #070b1f 100%)',
                    color: '#f4f6ff',
                    fontFamily: 'sans-serif',
                    padding: '64px 72px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 26, letterSpacing: 4, textTransform: 'uppercase', color: '#a9b3d6' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 999, background: '#4fd1b5', display: 'flex' }} />
                    AI Solutions
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', fontSize: 76, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2 }}>
                    <div style={{ display: 'flex' }}>We make your</div>
                    <div style={{ display: 'flex' }}>business <span style={{ color: '#ffc83a', marginLeft: 16 }}>agent-ready</span></div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', fontSize: 30, color: '#a9b3d6' }}>ai-solutions.company</div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <img alt="" src={ana} width={120} height={120} style={{ borderRadius: 999, border: '4px solid #a98bff', objectFit: 'cover' }} />
                        <img alt="" src={sol} width={120} style={{ marginLeft: -28, borderRadius: 24 }} />
                        <img alt="" src={tally} width={120} height={120} style={{ marginLeft: -28, borderRadius: 999, border: '4px solid #4fd1b5', objectFit: 'cover' }} />
                    </div>
                </div>
            </div>
        ),
        { ...size },
    );
}
