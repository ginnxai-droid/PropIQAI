import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { Project } from "../types";
import {
  Building,
  MapPin,
  FileText,
  Compass,
  PlusSquare,
  HelpCircle,
} from "lucide-react";

export const ProjectsView: React.FC = () => {
  const { projects, addProject } = useApp();
  const [showAddProject, setShowAddProject] = useState(false);

  // Form Fields State
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [rera, setRera] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [possession, setPossession] = useState("");
  const [desc, setDesc] = useState("");

  const formatPrice = (val: number) => {
    return `${(val / 100000).toFixed(0)} Lakhs`;
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location || !rera) return;

    const newProj: Project = {
      id: `proj_${projects.length + 1}`,
      name,
      location,
      developer_name: "PropIQ Developers",
      rera_number: rera,
      price_min: Number(minPrice) || 5000000,
      price_max: Number(maxPrice) || 10000000,
      possession_date: possession || "2028-12-31",
      description: desc || "Modern gated architecture.",
      brochure_url: "https://example.com/brochure.pdf",
      location_pin_url: "https://maps.google.com",
      floor_plan_url: "https://example.com/floorplans.pdf",
      active: true,
      amenities: ["Gated security", "Electric Power Backup", "Multi-Clubhouse"],
      faqs: [{ question: "Parking details?", answer: "Reserved basement car park space is allocated with every premium apartment." }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addProject(newProj);
    
    // Reset
    setShowAddProject(false);
    setName("");
    setLocation("");
    setRera("");
    setMinPrice("");
    setMaxPrice("");
    setPossession("");
    setDesc("");
  };

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto">
      
      {/* Header bar */}
      <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-zinc-150 text-sm flex items-center gap-1.5">
            <Building className="w-5 h-5 text-indigo-400" />
            RERA Approved Project Inventories
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Configure dynamic context data (amenities, FAQs, floor-plans, brochures, locations) for automated AI buyer qualification.
          </p>
        </div>

        <button
          onClick={() => setShowAddProject(!showAddProject)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
        >
          <PlusSquare className="w-4 h-4" />
          <span>Add New Project</span>
        </button>
      </div>

      {/* Project form */}
      {showAddProject && (
        <form onSubmit={handleCreateProject} className="bg-[#121214] border border-zinc-800 p-5 rounded-xl shadow-md space-y-4 text-xs font-semibold text-zinc-300 animate-fade-in text-zinc-300">
          <h4 className="font-bold text-zinc-150 text-sm">Register Approved Inventory</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-zinc-400">Project Name</label>
              <input
                type="text"
                required
                placeholder="e.g. PropIQ Signature Towers"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-100 focus:bg-zinc-850 focus:outline-none placeholder-zinc-650"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-zinc-400">Location Area</label>
              <input
                type="text"
                required
                placeholder="e.g. Baner, Pune"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-100 focus:bg-zinc-850 focus:outline-none placeholder-zinc-650"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-zinc-400">RERA Reg Number</label>
              <input
                type="text"
                required
                placeholder="e.g. P52100085421"
                value={rera}
                onChange={(e) => setRera(e.target.value)}
                className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-100 focus:bg-zinc-850 focus:outline-none placeholder-zinc-650"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-zinc-400">Starting Price (INR)</label>
              <input
                type="number"
                placeholder="e.g. 7500000"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-100 focus:bg-zinc-850 focus:outline-none placeholder-zinc-650"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-zinc-400">Max Price (INR)</label>
              <input
                type="number"
                placeholder="e.g. 15000000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-100 focus:bg-zinc-850 focus:outline-none placeholder-zinc-650"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-zinc-400">Possession Date</label>
              <input
                type="date"
                value={possession}
                onChange={(e) => setPossession(e.target.value)}
                className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-100 focus:bg-zinc-850 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-zinc-400">Intel Description and custom brochure references</label>
            <textarea
              placeholder="e.g. Premium 3BHK high-rises overlook national highway expressway grids..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-100 focus:bg-zinc-850 focus:outline-none placeholder-zinc-650 animate-fade-in"
              rows={2}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-805">
            <button
              type="button"
              onClick={() => setShowAddProject(false)}
              className="px-3 py-1.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-705 text-white rounded-lg px-4 py-1.5 font-bold cursor-pointer"
            >
              Save Approved Project
            </button>
          </div>
        </form>
      )}

      {/* Projects List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((proj) => (
          <div key={proj.id} className="bg-[#121214] rounded-xl border border-zinc-800 shadow-lg overflow-hidden flex flex-col justify-between">
            {/* Top header */}
            <div className="p-5 border-b border-zinc-805 flex items-start justify-between">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase text-zinc-400 bg-zinc-800 border border-zinc-850 px-2 py-0.5 rounded">
                  RERA: {proj.rera_number}
                </span>
                <h4 className="font-extrabold text-zinc-150 text-sm mt-1.5">{proj.name}</h4>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-zinc-550 shrink-0" />
                  {proj.location}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-mono">Pricing Guideline</span>
                <span className="text-indigo-400 font-bold font-mono text-xs block mt-1">
                  {formatPrice(proj.price_min)} - {formatPrice(proj.price_max)}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="p-5 text-xs text-zinc-300 space-y-4">
              <p className="leading-relaxed font-semibold text-zinc-400">"{proj.description}"</p>

              {/* Amenities tags */}
              <div className="space-y-1">
                <span className="text-[9.5px] text-zinc-500 uppercase tracking-wider block font-mono font-semibold">Amenities Captured</span>
                <div className="flex flex-wrap gap-1.5">
                  {proj.amenities.map((am, i) => (
                    <span key={i} className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 text-[10px] font-bold">
                      {am}
                    </span>
                  ))}
                </div>
              </div>

              {/* FAQs capture */}
              {proj.faqs && proj.faqs.length > 0 && (
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] space-y-1.5 font-semibold text-zinc-350">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-mono font-bold flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-zinc-550" />
                    AI FAQ Context Rules (`faqs`):
                  </span>
                  <div>
                    <span className="block font-bold text-zinc-250">Q: {proj.faqs[0].question}</span>
                    <span className="block font-medium text-zinc-500 mt-0.5">A: {proj.faqs[0].answer}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Brochures links footer */}
            <div className="p-4 border-t border-zinc-805 bg-zinc-900/40 flex items-center justify-between text-[11px] text-zinc-450 font-bold">
              <span>Timeline: {proj.possession_date} (Possession)</span>
              <div className="flex items-center space-x-3 text-indigo-400 font-bold cursor-pointer">
                <a href={proj.brochure_url} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 hover:underline">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Brochure</span>
                </a>
                <a href={proj.location_pin_url} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 hover:underline">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Site GPS</span>
                </a>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
