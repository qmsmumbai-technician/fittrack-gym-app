// ============================================
// DASHBOARD SERVICE — owner-only
// Aggregates every stat card on the Owner Dashboard into one call.
//
// Note on cost: this loops every client to read their payments and
// today's attendance doc (N+1 reads). Fine at gym scale (a few hundred
// clients), but if this ever gets slow, move the running totals
// (today's collection, total collection) into a Cloud Function that
// maintains a single "stats" document on each payment write instead
// of recomputing from scratch on every dashboard load.
// ============================================
import { getAllClients, getClientStatus, getPayments } from "./client-service.js?v=2";
import { getAllTrainers } from "./trainer-service.js?v=2";
import { getTodayAttendance } from "./trainer-service.js?v=2";
import { getAllEquipment } from "./equipment-service.js?v=2";
import { getAllExpenses } from "./expense-service.js?v=2";

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isSameMonthDay(a, b) {
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export async function getDashboardStats() {
  const [clients, trainers, equipment, expenses] = await Promise.all([
    getAllClients(),
    getAllTrainers(),
    getAllEquipment(),
    getAllExpenses()
  ]);

  const today = new Date();

  let live = 0, expired = 0;
  let exp1to3 = 0, exp4to7 = 0, exp8to15 = 0;
  let demo = 0, dueCount = 0, dueTotal = 0;
  let birthdayToday = 0, anniversaryToday = 0;
  let todaysCollection = 0, totalCollection = 0;
  let todaysAttendance = 0;

  await Promise.all(clients.map(async (client) => {
    const { status, daysLeft } = getClientStatus(client);
    if (status === "expired") {
      expired++;
    } else {
      live++;
      if (daysLeft >= 1 && daysLeft <= 3) exp1to3++;
      else if (daysLeft >= 4 && daysLeft <= 7) exp4to7++;
      else if (daysLeft >= 8 && daysLeft <= 15) exp8to15++;
    }

    if (client.isDemo) demo++;
    if (client.dateOfBirth && isSameMonthDay(client.dateOfBirth.toDate(), today)) birthdayToday++;
    if (client.anniversaryDate && isSameMonthDay(client.anniversaryDate.toDate(), today)) anniversaryToday++;

    const [payments, attendance] = await Promise.all([
      getPayments(client.id),
      getTodayAttendance(client.id)
    ]);

    if (attendance && attendance.checkInTime) todaysAttendance++;

    let paid = 0;
    for (const p of payments) {
      paid += p.amount || 0;
      const d = p.date && p.date.toDate ? p.date.toDate() : null;
      if (d && isSameDay(d, today)) todaysCollection += p.amount || 0;
    }
    totalCollection += paid;

    const due = (client.planPrice || 0) - paid;
    if (due > 0) { dueCount++; dueTotal += due; }
  }));

  const activeTrainers = trainers.filter(t => t.active).length;
  const equipmentAttention = equipment.filter(e => e.status && e.status !== "working").length;
  const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return {
    live, total: clients.length, expired,
    exp1to3, exp4to7, exp8to15,
    demo, dueCount, dueTotal,
    todaysCollection, totalCollection,
    totalExpense, balance: totalCollection - totalExpense,
    todaysAttendance, activeTrainers, equipmentAttention,
    birthdayToday, anniversaryToday
  };
}
