export const registeredWorklets = new Map();

export function createWorketFromSrc(workletName, workletSrc) {
    const script = new Blob([`(${workletSrc.toString()})()`], { type: 'application/javascript' });
    return URL.createObjectURL(script);
} 