
interface StaffActivity {
  name: string;
  role: string;
  action: string;
  orderId?: string;
  table?: string;
}

const exampleActivities: StaffActivity[] = [
  { name: "Budi", role: "Kasir", action: "Menerima pesanan #123" },
  { name: "Siti", role: "Kitchen", action: "Menyelesaikan makanan #123" },
  { name: "Andi", role: "Pelayan", action: "Mengantar pesanan ke meja 5" },
];

export default function Footer() {
  return (
    <div className="hidden sm:block border max-w-4xl mx-auto rounded-full border-gray-200 py-4 fixed bottom-0 left-0 right-0 bg-white mb-2 z-10">
      <div className="w-full flex flex-col items-center justify-center px-4">
        <ul className="flex flex-wrap justify-center items-center gap-4">
          {exampleActivities.map((activity, idx) => (
            <li key={idx} className="bg-gray-100 rounded-full px-4 py-1 text-xs text-gray-700 flex items-center gap-2">
              <span className="font-semibold">{activity.name}</span>
              <span className="text-gray-400">({activity.role})</span>
              <span className="text-gray-600">{activity.action}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}