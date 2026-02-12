import { useState } from "react";

function TextListInput({ field, value, onChange }) {
  const [inputVal, setInputVal] = useState("");
  const items = Array.isArray(value) ? value : [];

  const handleAdd = () => {
    const trimmed = inputVal.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
      setInputVal("");
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          placeholder={field.placeholder || "Add item..."}
          className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
        >
          Add
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {items.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="text-slate-400 hover:text-red-500"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRenderer({ field, value, onChange }) {
  switch (field.type) {
    case "select":
      return (
        <select
          value={value}
          onChange={(e) => {
            const opt = field.options.find((o) => String(o.value) === e.target.value);
            onChange(opt ? opt.value : e.target.value);
          }}
          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    case "checkbox_group": {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="grid grid-cols-2 gap-2">
          {field.options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selected, opt.value]);
                  } else {
                    onChange(selected.filter((v) => v !== opt.value));
                  }
                }}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      );
    }

    case "number":
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={field.min}
          max={field.max}
          placeholder={field.placeholder}
          className="w-32 text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      );

    case "text_list":
      return <TextListInput field={field} value={value} onChange={onChange} />;

    default:
      return null;
  }
}

export default function TabOnboarding({
  title,
  description,
  customizationFields = [],
  suggestedQuestions = [],
  prompt,
  onComplete,
  onUseDefaults,
}) {
  // Initialize field values from defaults
  const [values, setValues] = useState(() => {
    const init = {};
    customizationFields.forEach((f) => {
      init[f.key] = Array.isArray(f.default) ? [...f.default] : f.default;
    });
    return init;
  });

  const updateField = (key, val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const hasCustomization = customizationFields.length > 0;
  const hasQuestions = suggestedQuestions.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white rounded-2xl shadow-xl max-w-[600px] w-full mx-4 p-8 animate-[scaleIn_0.2s_ease-out]">
        {/* Header */}
        <div className="mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">{description}</p>
        </div>

        {/* Suggested questions (chat tab) */}
        {hasQuestions && (
          <div className="mb-6">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              Try asking
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, i) => (
                <span
                  key={i}
                  className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100"
                >
                  {q}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Prompt text (protocols, knowledge) */}
        {prompt && !hasCustomization && !hasQuestions && (
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm text-blue-700">{prompt}</p>
          </div>
        )}

        {/* Customization fields */}
        {hasCustomization && (
          <div className="space-y-4 mb-6">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Customize your experience
            </p>
            {customizationFields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {field.label}
                </label>
                <FieldRenderer
                  field={field}
                  value={values[field.key]}
                  onChange={(val) => updateField(field.key, val)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Prompt below customization (knowledge tab) */}
        {prompt && hasCustomization && (
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm text-blue-700">{prompt}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2">
          {hasCustomization ? (
            <>
              <button
                onClick={onUseDefaults}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Use Defaults
              </button>
              <button
                onClick={() => onComplete(values)}
                className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Preferences & Get Started
              </button>
            </>
          ) : (
            <button
              onClick={onUseDefaults}
              className="ml-auto px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
