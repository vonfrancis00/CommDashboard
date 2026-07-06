import { useEffect, useState } from "react";
import { X, Send } from "lucide-react";
import { request } from "../services/api";

export default function ForwardModal({
  isOpen,
  data,
  setData,
  onClose,
  onForward,
  isForwarding,
}) {

  const [sucs, setSucs] = useState([]);
  const [selectedSucs, setSelectedSucs] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    async function loadSucs() {
      try {
        const res = await request(
          "getSucs",
          "GET"
        );

        setSucs(res || []);

      } catch (err) {
        console.error("Failed loading SUCs:", err);
      }
    }

    loadSucs();

  }, [isOpen]);


  function toggleSUC(email) {

    let updated;

    if (selectedSucs.includes(email)) {

      updated = selectedSucs.filter(
        e => e !== email
      );

    } else {

      updated = [
        ...selectedSucs,
        email
      ];
    }


    setSelectedSucs(updated);


    setData(prev => {

      const manualEmails =
        (prev.to || "")
            .split(",")
            .map(e => e.trim())
            .filter(e =>
            e !== "" &&
            !sucs.some(
                s => s.email === e
            )
            );


        return {
        ...prev,

        to: [
            ...manualEmails,
            ...updated
        ]
        .filter(Boolean)
        .join(", ")
        };

    });

  }


  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">

      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/60 bg-white/95 p-8 shadow-2xl">


        {/* HEADER */}
        <div className="flex items-center justify-between">

          <div>
            <h2 className="text-xl font-black text-slate-900">
              Forward Email
            </h2>

            <p className="mt-1 text-xs font-semibold text-slate-400">
              Ref: {data.refNumber}
            </p>
          </div>


          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>

        </div>



        <div className="mt-6 space-y-4">


          {/* TO */}
          <div>

            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
              Forward To
            </label>


            <input
              type="text"
              value={data.to}
              onChange={(e)=>
                setData(prev=>({
                  ...prev,
                  to:e.target.value
                }))
              }

              placeholder="recipient@example.com"

              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500"
            />

          </div>



          {/* SUC LIST */}
          <div>

            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
              Select SUC Recipients
            </label>


            <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">


              {sucs.length === 0 && (

                <p className="text-xs text-slate-400">
                  No SUCs found
                </p>

              )}


              {sucs.map((suc,index)=>(

                <label
                  key={index}
                  className="flex items-center gap-3 text-sm font-semibold text-slate-700"
                >

                  <input
                    type="checkbox"

                    checked={
                      selectedSucs.includes(
                        suc.email
                      )
                    }

                    onChange={()=>
                      toggleSUC(
                        suc.email
                      )
                    }

                    className="h-4 w-4"
                  />


                  {suc.name}


                </label>

              ))}

            </div>

          </div>




          {/* SUBJECT */}
          <div>

            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
              Subject
            </label>


            <input
              type="text"

              value={data.subject}

              onChange={(e)=>
                setData(prev=>({
                  ...prev,
                  subject:e.target.value
                }))
              }


              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500"

            />

          </div>




          {/* CC */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">


            <input
              id="includeCc"
              type="checkbox"

              checked={
                data.includeOriginalCc
              }


              onChange={(e)=>
                setData(prev=>({
                  ...prev,
                  includeOriginalCc:
                    e.target.checked
                }))
              }

            />


            <label
              htmlFor="includeCc"
              className="text-sm font-medium text-slate-700"
            >
              Include CC recipients
            </label>


          </div>




          {/* BUTTONS */}
          <div className="flex justify-end gap-3 pt-2">


            <button
              onClick={onClose}

              className="rounded-2xl border px-5 py-3 text-xs font-black uppercase"
            >
              Cancel
            </button>



            <button
            onClick={async () => {

                const success =
                await onForward();

                if (success) {

                setSelectedSucs([]);

                setData(prev => ({
                    ...prev,
                    to: ""
                }));

                }

            }}

            disabled={isForwarding}


              className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-black uppercase text-white disabled:opacity-50"
            >

              <Send className="h-4 w-4"/>

              {isForwarding
                ? "Forwarding..."
                : "Forward"}

            </button>


          </div>


        </div>


      </div>

    </div>
  );
}