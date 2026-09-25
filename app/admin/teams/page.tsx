export default function AdminTeamsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin - Teams</h1>
      <div className="bg-gray-800 p-4 rounded mb-4">
        <h2 className="text-lg mb-2">Create Team</h2>
        <input type="text" placeholder="Team Name" className="border p-2 rounded mr-2" />
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Create</button>
      </div>
      <div className="bg-gray-800 p-4 rounded">
        <h2 className="text-lg mb-2">Teams List</h2>
        <p className="text-gray-400">Teams will appear here</p>
      </div>
    </div>
  )
}
