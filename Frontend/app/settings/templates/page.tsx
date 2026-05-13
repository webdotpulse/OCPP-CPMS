"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface MailTemplate {
  id?: number;
  name: string;
  type: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

export default function MailTemplatesPage() {
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<MailTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get("/mail/templates");
      if (response.data) {
        setTemplates(response.data.data);
      }
    } catch (error) {
      console.error("Failed to load templates", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: MailTemplate) => {
    setEditingTemplate(template);
  };

  const handleCreate = () => {
    setEditingTemplate({
      name: "",
      type: "",
      subject: "",
      bodyHtml: "",
      bodyText: "",
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this template?")) {
      try {
        await api.delete(`/mail/templates/${id}`);
        toast.success("Template deleted");
        fetchTemplates();
      } catch (error) {
        toast.error("Failed to delete template");
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplate?.id) {
        await api.put(`/mail/templates/${editingTemplate.id}`, editingTemplate);
        toast.success("Template updated");
      } else {
        await api.post("/mail/templates", editingTemplate);
        toast.success("Template created");
      }
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      toast.error("Failed to save template");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditingTemplate((prev) => prev ? { ...prev, [name]: value } : null);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mail Templates</h1>
        {!editingTemplate && (
          <button
            onClick={handleCreate}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Create Template
          </button>
        )}
      </div>

      {editingTemplate ? (
        <form onSubmit={handleSave} className="max-w-3xl space-y-4 border p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">{editingTemplate.id ? "Edit Template" : "New Template"}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                type="text"
                name="name"
                value={editingTemplate.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Type (Unique ID)</label>
              <input
                type="text"
                name="type"
                value={editingTemplate.type}
                onChange={handleChange}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Subject</label>
            <input
              type="text"
              name="subject"
              value={editingTemplate.subject}
              onChange={handleChange}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">HTML Body</label>
            <textarea
              name="bodyHtml"
              value={editingTemplate.bodyHtml}
              onChange={handleChange}
              rows={5}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Text Body</label>
            <textarea
              name="bodyText"
              value={editingTemplate.bodyText}
              onChange={handleChange}
              rows={5}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 font-mono"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditingTemplate(null)}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left">Name</th>
                <th className="py-2 px-4 border-b text-left">Type</th>
                <th className="py-2 px-4 border-b text-left">Subject</th>
                <th className="py-2 px-4 border-b text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr key={tpl.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{tpl.name}</td>
                  <td className="py-2 px-4 border-b">{tpl.type}</td>
                  <td className="py-2 px-4 border-b">{tpl.subject}</td>
                  <td className="py-2 px-4 border-b text-center space-x-2">
                    <button
                      onClick={() => handleEdit(tpl)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => tpl.id && handleDelete(tpl.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500">
                    No templates found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
