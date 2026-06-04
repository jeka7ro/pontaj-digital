const { isSameDay, startOfWeek, addDays } = require('date-fns');

const currentDate = new Date('2026-06-04T12:00:00');
const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

const workOrders = [
    {
        id: '1',
        title: 'Test Eugen',
        start_date: '2026-06-05',
        start_time: null,
        deadline_date: '2026-06-05'
    }
];

const weeklyOrders = workOrders.filter(wo => {
    const dateStr = wo.start_date || wo.deadline_date;
    if (!dateStr) return false;
    try {
        const datePart = dateStr.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        const woDate = new Date(year, month - 1, day, 12, 0, 0);
        return weekDays.some(d => isSameDay(d, woDate));
    } catch (e) {
        return false;
    }
});

console.log('weeklyOrders length:', weeklyOrders.length);

const rendered = weeklyOrders.map(wo => {
    const dateStr = wo.start_date || wo.deadline_date;
    let woDate;
    try {
        const datePart = dateStr.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        woDate = new Date(year, month - 1, day, 12, 0, 0);
    } catch (e) {
        return null;
    }
    
    const dayIndex = weekDays.findIndex(d => isSameDay(d, woDate));
    if (dayIndex === -1) return null;

    return {
        id: wo.id,
        dayIndex
    }
});

console.log('rendered:', rendered);
