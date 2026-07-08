import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useDebounce } from "use-debounce";
import { request } from "../services/api";
import ForwardModal from "../components/ForwardModal";
import TimelineDot from "../components/TimelineDot";
import {
  Activity,
  Search,
  RefreshCw,
  Inbox,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Mail,
  ThumbsUp,
  Calendar,
  LayoutGrid,
  Clock,
  ChevronLeft,
  Trash2,
  X,
  Send,
  Eye,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";


const ROWS_PER_PAGE = 30;
const AUTO_REFRESH_MS = 60000;
let dashboardCache = null;
let dashboardLoaded = false;

const cardStyle =
  "group relative rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1";

function safe(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function cleanName(value) {
  const text = safe(value);
  let cleaned = text.replace(/\s*<[^>]*>\s*/g, "");
  cleaned = cleaned.replace(/\s*\([^)]*@[^)]*\)\s*/g, "");

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    cleaned = cleaned.split("@")[0].replace(/[._]/g, " ");
  }

  return cleaned.trim();
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(String(value));
  return isNaN(date) ? null : date;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return safe(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function normalize(item = {}) {
  const activity = safe(item.Activity || item.activity);
  const refNumber = safe(item["Ref number"] || item.refNumber || item.RefNumber);
  const receivedFrom = cleanName(item["Received From"] || item.receivedFrom);
  const subject = safe(item.Subject || item.subject);
  const remarks = safe(item.Remarks || item.remarks);
  const dateReceived = item["Date Received"] || item.dateReceived;
  const fileLink = safe(
  item["File Links"] ||
  item["File Link"] ||
  item["Previous File"] ||
  item["URL"] ||
  item["Url"] ||
  item["Links"] ||
  item.fileLink ||
  item.Link ||
  item.link
);
  const parsedDate = parseDate(dateReceived);

  return {
    activity,
    refNumber,
    receivedFrom,
    subject,
    remarks,
    dateReceived,
    fileLink,
    parsedDate,
    searchBlob: [activity, refNumber, receivedFrom, subject, remarks]
      .join(" ")
      .toLowerCase(),
  };
}

const getStatusStyles = (status) => {
  const s = status?.toLowerCase() || "";
  if (s === "pending") return "bg-orange-500/10 text-orange-600 border-orange-200/50";
  if (s === "actioned" || s === "approved")
    return "bg-emerald-500/10 text-emerald-600 border-emerald-200/50";
  if (s === "for action") return "bg-blue-500/10 text-blue-600 border-blue-200/50";
  if (s === "invitations") return "bg-purple-500/10 text-purple-600 border-purple-200/50";
  return "bg-slate-500/10 text-slate-600 border-slate-200/50";
};

function ModernStatCard({
  icon: Icon,
  label,
  value,
  hint,
  color,
  onClick,
  active,
}) {
  return (
    <div
  onClick={onClick}
  className={`${cardStyle} cursor-pointer ${
    active
      ? "ring-2 ring-indigo-500 bg-indigo-50/70"
      : "hover:ring-2 hover:ring-indigo-300"
  }`}
>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ${color}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
            <Activity className="h-3 w-3" /> Live
          </span>
        </div>

        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{value}</h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
        </div>

        <div className="border-t border-slate-50 pt-4">
          <p className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
            <span className={`h-1.5 w-1.5 rounded-full ${color?.replace("text", "bg")}`} />
            {hint}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CommTrackDashboard() {
  const [rows, setRows] = useState(dashboardCache || []);
  const [fastStats, setFastStats] = useState(null);
  const [loading, setLoading] = useState(!dashboardLoaded);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search] = useDebounce(searchInput, 300);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [remarkFilter, setRemarkFilter] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [todayFilter, setTodayFilter] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [refresh, setRefresh] = useState(0);
  const [page, setPage] = useState(1);
  const [savingRemarks, setSavingRemarks] = useState({});
  const [deletingRows, setDeletingRows] = useState({});
  const [isForwarding, setIsForwarding] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  
  const [viewModal, setViewModal] = useState({
  isOpen: false,
  link: "",
  title: "",
});

  const [forwardModal, setForwardModal] = useState({
  isOpen: false,
  refNumber: "",
  to: "",
  subject: "",
  includeOriginalCc: true,
});

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: "alert",
    title: "",
    message: "",
    onConfirm: null,
  });

  const [timelineModal, setTimelineModal] = useState({
  isOpen: false,
  refNumber: "",
  data: [],
  dateReceived: "",
});
const [loadingTimeline, setLoadingTimeline] = useState(null);

  const rowsRef = useRef([]);
  const tableContainerRef = useRef(null);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const showPopupAlert = (title, message) => {
    setModalConfig({
      isOpen: true,
      type: "alert",
      title,
      message,
      onConfirm: null,
    });
  };

  const showPopupSuccess = (title, message) => {
    setModalConfig({
      isOpen: true,
      type: "success",
      title,
      message,
      onConfirm: null,
    });
  };

  const showPopupConfirm = (title, message, onConfirmHandler) => {
    setModalConfig({
      isOpen: true,
      type: "confirm",
      title,
      message,
      onConfirm: onConfirmHandler,
    });
  };

  const showPopupLoading = (title, message) => {
    setModalConfig({
      isOpen: true,
      type: "loading",
      title,
      message,
      onConfirm: null,
    });
  };

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const openForwardModal = (refNumber) => {
  const row = rows.find(r => r.refNumber === refNumber);

  setForwardModal({
    isOpen: true,
    refNumber,
    to: "",
    subject: row?.subject || "",
    includeOriginalCc: true,
    originalCc: "",
  });
};

  const closeForwardModal = () => {
  setForwardModal({
    isOpen: false,
    refNumber: "",
    to: "",
    subject: "",
  });
};

const openTimeline = async (refNumber) => {

  const selectedRow = rows.find(
    r => r.refNumber === refNumber
  );

  setLoadingTimeline(refNumber);

  setTimelineModal({
    isOpen: true,
    refNumber,
    data: [],
    dateReceived: selectedRow?.dateReceived || "",
  });

  try {

    const result = await request(
      "getTimeline",
      "POST",
      {
        refNumber,
      }
    );

    setTimelineModal({
  isOpen: true,
  refNumber,
  data: result || [],
  dateReceived: selectedRow?.dateReceived || "",
});

  } catch (err) {

    console.error(err);

    setTimelineModal({
  isOpen: true,
  refNumber,
  data: result || [],
  dateReceived: selectedRow?.dateReceived || "",
});

    showPopupAlert(
      "Timeline Error",
      "Unable to load timeline history."
    );

  } finally {

    setLoadingTimeline(null);

  }

};
const fetchDashboardStats = async () => {

  try {

    const result =
      await request(
        "getDashboardData",
        "GET"
      );


    if (
      result?.success &&
      result?.counts
    ) {

      setFastStats(
        result.counts
      );

    }


  } catch (err) {

    console.warn(
      "Dashboard refresh skipped:",
      err.message
    );

  }

};
  const fetchData = useCallback(
async (silent=false)=>{

 try{

  if(!silent){
    setLoading(true);
  }else{
    setIsRefreshing(true);
  }


  const data =
    await request(
      "getRecords",
      "GET"
    );


  const incoming =
    Array.isArray(data)
    ? data
    : [];


  const normalized =
    incoming.map(normalize);


  const oldCount =
    rowsRef.current.length;


  if(
      normalized.length !== oldCount
    ){

      dashboardCache = normalized;
      dashboardLoaded = true;

      setRows(normalized);

    } else{

    const changed =
      normalized.some(
        (item,index)=>
          item.refNumber !==
          rowsRef.current[index]?.refNumber
          ||
          item.remarks !==
          rowsRef.current[index]?.remarks
      );


    if(changed){
      dashboardCache = normalized;
      dashboardLoaded = true;

      setRows(normalized);
    }
  }


 }catch(err){

  console.error(err);

 }finally{

  setLoading(false);
  setIsRefreshing(false);

 }

},[]);

  const updateRemark = useCallback(
    async (refNumber, newRemark) => {
      if (!refNumber) return;

      const currentRow = rowsRef.current.find((r) => r.refNumber === refNumber);
      const previousRemark = currentRow?.remarks || "";

      setSavingRemarks((prev) => ({ ...prev, [refNumber]: true }));

      setRows((prev) =>
        prev.map((row) =>
          row.refNumber === refNumber ? { ...row, remarks: newRemark } : row
        )
      );

      try {
        const currentUser =
  JSON.parse(localStorage.getItem("user") || "{}");


const result = await request(
  "updateRemark",
  "POST",
  {
    sheet: "Sheet1",
    refNumber,
    oldRemarks: previousRemark,
    remarks: newRemark,

    updatedBy:
      currentUser.name ||
      currentUser.username ||
      "Unknown User",
  }
);

        if (!result.success) {
          throw new Error(result.error || "Failed to update remarks");
        }

        showPopupSuccess(
          "Changes Saved",
          `Reference ${refNumber} status has been updated to "${newRemark || "No Remark"}" successfully.`
        );
      } catch (err) {
        console.error("Update remark error:", err);

        setRows((prev) =>
          prev.map((row) =>
            row.refNumber === refNumber ? { ...row, remarks: previousRemark } : row
          )
        );

        showPopupAlert("Error", "Could not save remarks. Please check your connection.");
      } finally {
        setSavingRemarks((prev) => ({ ...prev, [refNumber]: false }));
      }
    },
    [fetchData]
  );
  
  const updateMultipleRemarks = async (newRemark) => {
  if (!selectedRows.length) return;

  showPopupLoading(
    "Updating Records",
    `Changing ${selectedRows.length} record(s) to "${newRemark}". Please wait...`
  );

  try {
    // GET LOGGED IN USER
    const currentUser =
      JSON.parse(
        localStorage.getItem("user") || "{}"
      );

    // collect old status for timeline
    const updates =
      selectedRows.map(
        (refNumber) => {

          const row =
            rowsRef.current.find(
              r => r.refNumber === refNumber
            );
          return {
            refNumber,
            oldRemarks:
              row?.remarks || ""
          };
        }
      );

    const result =
      await request(
        "updateMultipleRemarks",
        "POST",
        {
          sheet:"Sheet1",
          updates,
          remarks:newRemark,

          // SEND USER TO BACKEND
          updatedBy:
            currentUser.name ||
            currentUser.username ||
            "Unknown User",
        }
      );

    if (!result.success) {
      throw new Error(
        result.error
      );
    }

    // update UI instantly
    setRows(
      (prev) =>
        prev.map(
          (row) =>
            selectedRows.includes(
              row.refNumber
            )
            ?
            {
              ...row,
              remarks:newRemark
            }
            :
            row
        )
    );
    setSelectedRows([]);
    closeModal();
    showPopupSuccess(
      "Changes Saved",
      `${result.updated} record(s) updated successfully${
        result.emailsSent !== undefined
          ? ` and ${result.emailsSent} email(s) sent.`
          : "."
      }`
    );
  } catch(err) {
    console.error(err);
    closeModal();
    showPopupAlert(
      "Update Failed",
      err.message ||
      "Unable to update selected records."
    );

  }
};

  const executeDelete = useCallback(
    async (refNumber) => {
      const snapshot = rowsRef.current;

      setDeletingRows((prev) => ({ ...prev, [refNumber]: true }));
      showPopupLoading("Deleting Record", "Please wait while the record is being deleted.");
      setRows((prev) => prev.filter((row) => row.refNumber !== refNumber));

      try {
        const result = await request("deleteRecord", "POST", {
  refNumber,
});

        if (!result.success) {
          throw new Error(result.error || "Delete failed");
        }

        closeModal();
        showPopupSuccess(
          "Record Deleted",
          `Reference ${refNumber} and its dependencies have been purged successfully.`
        );
      } catch (err) {
        console.error("Delete error:", err);
        setRows(snapshot);

        closeModal();
        showPopupAlert("Deletion Failed", "Could not delete record from server database.");
      } finally {
        setDeletingRows((prev) => ({ ...prev, [refNumber]: false }));
      }
    },
    [fetchData]
  );

  const deleteRecord = useCallback(
    (refNumber) => {
      if (!refNumber) return;

      showPopupConfirm(
        "Confirm Deletion",
        "Are you sure you want to delete this record and its related Gmail/Drive items? This cannot be undone.",
        () => executeDelete(refNumber)
      );
    },
    [executeDelete]
  );
  const executeMultipleDelete = async () => {

  showPopupLoading(
    "Deleting Records",
    `Deleting ${selectedRows.length} selected records...`
  );

  try {

    const result = await request("deleteMultipleRecords", "POST", {
  sheet: "Sheet1",
  refNumbers: selectedRows,
});

    if (!result.success) {
      throw new Error(result.error || "Delete failed");
    }

    setSelectedRows([]);

    lastSignatureRef.current = "";

    await fetchData(true);

    closeModal();

    showPopupSuccess(
      "Deleted",
      "Selected records were deleted successfully."
    );

  } catch (err) {

    console.error(err);

    closeModal();

    showPopupAlert(
      "Delete Failed",
      err.message || "Unable to delete records."
    );

  }
};

const deleteMultipleRecords = () => {

  if (!selectedRows.length) return;

  showPopupConfirm(
    "Delete Selected Records",
    `Delete ${selectedRows.length} selected record(s)? This cannot be undone.`,
    executeMultipleDelete
  );

};

  const forwardRecord = async () => {
    if (!forwardModal.refNumber || !forwardModal.to.trim()) {
      showPopupAlert("Missing Recipient", "Please enter the forward recipient.");
      return;
    }

    setIsForwarding(true);
    closeForwardModal();
    showPopupLoading("Forwarding Email", "Please wait while the email is being forwarded.");

    try {
      const result = await request("forwardRecord", "POST", {
  refNumber: forwardModal.refNumber,
  to: forwardModal.to,
  subject: forwardModal.subject,
  includeOriginalCc: forwardModal.includeOriginalCc,
});

      if (!result.success) {
        throw new Error(result.error || "Forward failed");
      }

      closeModal();
      showPopupSuccess("Email Forwarded", result.message || "Email forwarded successfully.");
    } catch (err) {
      console.error("Forward error:", err);

      closeModal();
      showPopupAlert("Forward Failed", err.message || "Could not forward the email.");
    } finally {
      setIsForwarding(false);
    }
  };

  useEffect(() => {

  const loadDashboard = async () => {

    await fetchDashboardStats();

    await fetchData(
      dashboardLoaded
    );

  };


  loadDashboard();


  const intervalId =
    setInterval(
      async () => {

        await fetchDashboardStats();

        await fetchData(true);

      },
      AUTO_REFRESH_MS
    );


  return () =>
    clearInterval(intervalId);


}, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [search, startDate, endDate, remarkFilter, selectedYear, todayFilter,]);

  const toggleRow = (refNumber) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(refNumber)) newExpanded.delete(refNumber);
    else newExpanded.add(refNumber);
    setExpandedRows(newExpanded);
  };
  const toggleRowSelection = (refNumber) => {
  setSelectedRows((prev) =>
    prev.includes(refNumber)
      ? prev.filter((r) => r !== refNumber)
      : [...prev, refNumber]
  );
};

const toggleSelectAll = () => {
  const currentPageRefs = paginatedRows.map((r) => r.refNumber);

  const allSelected = currentPageRefs.every((r) =>
    selectedRows.includes(r)
  );

  if (allSelected) {
    setSelectedRows((prev) =>
      prev.filter((r) => !currentPageRefs.includes(r))
    );
  } else {
    setSelectedRows((prev) => [
      ...new Set([...prev, ...currentPageRefs]),
    ]);
  }
};

  const availableYears = useMemo(() => {
    const years = rows.map((r) => r.parsedDate?.getFullYear()).filter(Boolean);
    return ["All", ...new Set(years)].sort((a, b) => (b === "All" ? -1 : b - a));
  }, [rows]);

  const remarkOptions = useMemo(() => {
    const defaults = ["Pending", "For Action", "Invitations", "For Info", "Approved", "Actioned"];
    const fromRows = rows.map((r) => r.remarks).filter(Boolean);
    return ["", ...new Set([...defaults, ...fromRows])];
  }, [rows]);

  const filteredRows = useMemo(() => {
  const q = search.toLowerCase();
  const start = startDate ? new Date(startDate).getTime() : null;
  const end = endDate ? new Date(endDate + "T23:59:59").getTime() : null;

  const now = new Date();

  return rows
    .filter((row) => {
      if (q && !row.searchBlob.includes(q)) return false;

      if (
        remarkFilter !== "All" &&
        row.remarks !== remarkFilter
      )
        return false;


      // TODAY CARD FILTER
      if (todayFilter) {
        if (!row.parsedDate) return false;

        if (
          row.parsedDate.getFullYear() !== now.getFullYear() ||
          row.parsedDate.getMonth() !== now.getMonth() ||
          row.parsedDate.getDate() !== now.getDate()
        ) {
          return false;
        }
      }

        if (start || end) {
          if (!row.parsedDate) return false;
          const time = row.parsedDate.getTime();
          if (start && time < start) return false;
          if (end && time > end) return false;
        }

        return true;
      })
      .sort((a, b) => (b.parsedDate?.getTime() || 0) - (a.parsedDate?.getTime() || 0));
  }, [rows, search, startDate, endDate, remarkFilter, todayFilter,]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return filteredRows.slice(start, start + ROWS_PER_PAGE);
  }, [filteredRows, page]);

  const { chartData, statusData, stats } = useMemo(() => {
    const monthMap = new Map();
    const statusMap = new Map();
    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const chartFilteredRows =
      selectedYear === "All"
        ? rows
        : rows.filter((r) => r.parsedDate?.getFullYear().toString() === selectedYear);

    chartFilteredRows.forEach((row) => {
      const mKey = row.parsedDate
        ? row.parsedDate.toLocaleDateString("en-US", { month: "short" })
        : "N/A";
      monthMap.set(mKey, (monthMap.get(mKey) || 0) + 1);

      const sKey = row.remarks || "No Remark";
      statusMap.set(sKey, (statusMap.get(sKey) || 0) + 1);
    });

    const getC = (v) => rows.filter((r) => r.remarks?.toLowerCase() === v.toLowerCase()).length;

    return {
      chartData: monthOrder.map((m) => ({ month: m, count: monthMap.get(m) || 0 })),
      statusData: Array.from(statusMap.entries()).map(([name, value]) => ({ name, value })),
      stats: {
  today: rows.filter((r) => {
    if (!r.parsedDate) return false;

    const today = new Date();

    return (
      r.parsedDate.getFullYear() === today.getFullYear() &&
      r.parsedDate.getMonth() === today.getMonth() &&
      r.parsedDate.getDate() === today.getDate()
    );
  }).length,

  approved: getC("Approved"),
  actioned: getC("Actioned"),
  forInfo: getC("For Info"),
  disapproved: getC("Disapproved"),
  invitations: getC("Invitations"),
  acknowledge: getC("Acknowledge"),
  memorandums: getC("Memorandums"),
  forAction: getC("For Action"),
  pending: getC("Pending"),
},
    };
  }, [rows, selectedYear]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));

  return (
    <div className="relative z-10 mx-auto max-w-[1400px] px-8 py-12">
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-all duration-300">
          <div className="w-full max-w-md scale-100 overflow-hidden rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-2xl transition-all duration-300">
            <div className="flex items-start justify-between gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  modalConfig.type === "success"
                    ? "bg-emerald-50 text-emerald-600"
                    : modalConfig.type === "loading"
                      ? "bg-indigo-50 text-indigo-600"
                      : "bg-indigo-50 text-indigo-600"
                }`}
              >
                {modalConfig.type === "success" ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : modalConfig.type === "loading" ? (
                  <RefreshCw className="h-6 w-6 animate-spin" />
                ) : (
                  <AlertCircle className="h-6 w-6" />
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-extrabold text-slate-900">{modalConfig.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
                  {modalConfig.message}
                </p>
              </div>

              {modalConfig.type !== "loading" && (
                <button
                  onClick={closeModal}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {modalConfig.type !== "loading" && (
              <div className="mt-8 flex justify-end gap-3">
                {modalConfig.type === "confirm" ? (
                  <>
                    <button
                      onClick={closeModal}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (modalConfig.onConfirm) modalConfig.onConfirm();
                        closeModal();
                      }}
                      className="rounded-2xl bg-red-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500"
                    >
                      Confirm Action
                    </button>
                  </>
                ) : modalConfig.type === "success" ? (
                  <button
                    onClick={closeModal}
                    className="rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
                  >
                    Great
                  </button>
                ) : (
                  <button
                    onClick={closeModal}
                    className="rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-slate-800"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            )}

            {modalConfig.type === "loading" && (
              <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <span className="h-3 w-3 animate-pulse rounded-full bg-indigo-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Loading...
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      <ForwardModal
  isOpen={forwardModal.isOpen}
  data={forwardModal}
  setData={setForwardModal}
  onClose={closeForwardModal}
  onForward={forwardRecord}
  isForwarding={isForwarding}
/>
<TimelineDot
  isOpen={timelineModal.isOpen}
  refNumber={timelineModal.refNumber}
  data={timelineModal.data}
  dateReceived={timelineModal.dateReceived}
  loading={loadingTimeline !== null}
  onClose={() =>
    setTimelineModal({
      isOpen:false,
      refNumber:"",
      data:[]
    })
  }
/>
{viewModal.isOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-6">
    <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="font-black text-slate-800">
            View Communication
          </h2>

          <p className="text-xs text-slate-400">
            {viewModal.title}
          </p>
        </div>

        <button
          onClick={() =>
            setViewModal({
              isOpen: false,
              link: "",
              title: "",
            })
          }
          className="rounded-full bg-slate-100 p-2 hover:bg-red-100"
        >
          <X className="h-5 w-5 text-slate-500" />
        </button>
      </div>


      {viewModal.link.includes("mail.google.com") ? (

  <div className="flex h-full flex-col items-center justify-center gap-5">

    <Mail className="h-20 w-20 text-indigo-500" />

    <h2 className="text-xl font-black text-slate-800">
      Gmail communication cannot be previewed
    </h2>

    <p className="text-sm text-slate-500">
      Gmail blocks embedded previews for security.
    </p>

    <button
      onClick={() =>
        window.open(
          viewModal.link,
          "_blank"
        )
      }
      className="
        rounded-xl 
        bg-indigo-600 
        px-6 py-3 
        text-sm 
        font-bold 
        text-white
        hover:bg-indigo-700
      "
    >
      Open in Gmail
    </button>

  </div>

) : (

  <iframe
    src={
      viewModal.link
        ?.replace("/view", "/preview")
        ?.replace("?usp=sharing", "")
    }
    title="Communication Viewer"
    className="h-full w-full"
  />

)}

    </div>
  </div>
)}


      <div className="mb-12 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-600/5 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" />
            </span>
            Google Email Live
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
            Communication <span className="font-bold italic text-slate-400">Hub</span>
          </h1>

          <p className="mt-2 text-sm font-medium text-slate-400">
            A centralized platform for efficient communication tracking, monitoring, and document management.
          </p>
        </div>

        <button
          onClick={() => {
            fetchDashboardStats();
            fetchData(true);}}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading || isRefreshing ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>
          <div className="mb-8 grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <ModernStatCard
              icon={Calendar}
              label="Today"
              value={fastStats?.today ?? stats.today}
              hint="Received Today"
              color="text-cyan-500"
              active={todayFilter}
              onClick={() => {
                setTodayFilter((prev) => !prev);
                setRemarkFilter("All");
              }}
            />
            <ModernStatCard
            icon={AlertCircle}
            label="Pending"
            value={fastStats?.pending ?? stats.pending}
            hint="Awaiting Action"
            color="text-orange-500"
            active={remarkFilter === "Pending"}
            onClick={() =>
              setRemarkFilter((prev) => (prev === "Pending" ? "All" : "Pending"))
            }
          />
          <ModernStatCard
            icon={CheckCircle2}
            label="Acknowledge"
            value={fastStats?.acknowledge ?? stats.acknowledge}
            hint="Acknowledged"
            color="text-indigo-500"
            active={remarkFilter === "Acknowledge"}
            onClick={() =>
              setRemarkFilter((prev) =>
                prev === "Acknowledge" ? "All" : "Acknowledge"
              )
            }
          />
          <ModernStatCard
            icon={Activity}
            label="For Action"
            value={fastStats?.forAction ?? stats.forAction}
            hint="Requires Action"
            color="text-blue-500"
            active={remarkFilter === "For Action"}
            onClick={() =>
              setRemarkFilter((prev) => (prev === "For Action" ? "All" : "For Action"))
            }
          />
          <ModernStatCard
            icon={Mail}
            label="Invitations"
            value={fastStats?.invitations ?? stats.invitations}
            hint="Event Invites"
            color="text-purple-500"
            active={remarkFilter === "Invitations"}
            onClick={() =>
              setRemarkFilter((prev) =>
                prev === "Invitations" ? "All" : "Invitations"
              )
            }
          />
          <ModernStatCard
            icon={Activity}
            label="Memorandums"
            value={fastStats?.memorandums ?? stats.memorandums}
            hint="Internal Memos"
            color="text-amber-500"
            active={remarkFilter === "Memorandums"}
            onClick={() =>
              setRemarkFilter((prev) =>
                prev === "Memorandums" ? "All" : "Memorandums"
              )
            }
          />

          <ModernStatCard
            icon={ThumbsUp}
            label="Approved"
            value={fastStats?.approved ?? stats.approved}
            hint="Approved Records"
            color="text-emerald-500"
            active={remarkFilter === "Approved"}
            onClick={() =>
              setRemarkFilter((prev) => (prev === "Approved" ? "All" : "Approved"))
            }
          />

          <ModernStatCard
            icon={CheckCircle2}
            label="Actioned"
            value={fastStats?.actioned ?? stats.actioned}
            hint="Completed"
            color="text-green-700"
            active={remarkFilter === "Actioned"}
            onClick={() =>
              setRemarkFilter((prev) => (prev === "Actioned" ? "All" : "Actioned"))
            }
          />

          <ModernStatCard
            icon={Inbox}
            label="For Info"
            value={fastStats?.forInfo ?? stats.forInfo}
            hint="Information Only"
            color="text-slate-500"
            active={remarkFilter === "For Info"}
            onClick={() =>
              setRemarkFilter((prev) => (prev === "For Info" ? "All" : "For Info"))
            }
          />

          <ModernStatCard
            icon={AlertCircle}
            label="Disapproved"
            value={fastStats?.disapproved ?? stats.disapproved}
            hint="Needs Revision"
            color="text-red-500"
            active={remarkFilter === "Disapproved"}
            onClick={() =>
              setRemarkFilter((prev) =>
                prev === "Disapproved" ? "All" : "Disapproved"
              )
            }
          />

          

          

          

          

          
        </div>

      <div className="mb-12 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 rounded-[2.5rem] border border-white bg-white/60 p-8 shadow-sm backdrop-blur-md lg:col-span-2">
          <div className="mb-8 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Clock className="h-5 w-5 text-indigo-500" /> Volume Over Time
            </h3>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 outline-none"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y === "All" ? "All Years" : y}
                </option>
              ))}
            </select>
          </div>

          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fontWeight: 600, fill: "#94a3b8" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fontWeight: 600, fill: "#94a3b8" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                  }}
                />
                <Area
                  type="natural"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fill="url(#areaGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0 rounded-[2.5rem] border border-white bg-white/60 p-8 shadow-sm backdrop-blur-md">
          <h3 className="mb-8 flex items-center gap-2 text-lg font-bold">
            <LayoutGrid className="h-5 w-5 text-slate-400" /> Status Distribution
          </h3>

          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={statusData}>
                <XAxis dataKey="name" hide />
                <Tooltip cursor={{ fill: "transparent" }} />
                <Bar dataKey="value" radius={[10, 10, 10, 10]} barSize={40}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? "#6366f1" : "#cbd5e1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/40">
        <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Data Explorer</h2>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
                <p className="text-sm font-bold text-slate-400">
                  {filteredRows.length} entries analyzed
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="group relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search anything..."
                  className="w-64 rounded-2xl border border-slate-200 bg-white/50 py-3 pl-11 pr-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                <Calendar className="h-4 w-4 text-indigo-500" />

                <input
                  type="date"
                  className="bg-transparent text-[11px] font-black uppercase text-slate-600 outline-none"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />

                <span className="px-1 font-light text-slate-300">|</span>

                <input
                  type="date"
                  className="bg-transparent text-[11px] font-black uppercase text-slate-600 outline-none"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />

                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-red-100 hover:text-red-600"
                    title="Clear date filter"
                  >
                    ✕
                  </button>
                )}
              </div>

              <select
                className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-900 px-5 py-3 text-sm font-bold text-white outline-none shadow-lg hover:bg-slate-800"
                value={remarkFilter}
                onChange={(e) => setRemarkFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                {[...new Set(rows.map((r) => r.remarks))].filter(Boolean).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
                {selectedRows.length > 0 && (
  <div className="flex items-center justify-between border-b border-slate-200 bg-indigo-50 px-6 py-4">
    <div className="text-sm font-bold text-slate-700">
      {selectedRows.length} record{selectedRows.length > 1 ? "s" : ""} selected
    </div>

    <div className="flex items-center gap-3">

      <select
        defaultValue=""
        onChange={(e) => {
          if (!e.target.value) return;
          updateMultipleRemarks(e.target.value);
          e.target.value = "";
        }}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"
      >
        <option value="">Change Remarks</option>

        {remarkOptions
          .filter(Boolean)
          .map((remark) => (
            <option key={remark} value={remark}>
              {remark}
            </option>
          ))}
      </select>

      <button
        onClick={deleteMultipleRecords}
        className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
      >
        <Trash2 className="h-4 w-4" />
        Delete Selected
      </button>

    </div>
  </div>
)}
        <div ref={tableContainerRef} className="max-h-[80vh] overflow-y-auto overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              <tr className="bg-white/95 backdrop-blur-md">
                <th className="border-b border-slate-100 px-4 py-5 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedRows.length > 0 &&
                      paginatedRows.every((r) =>
                        selectedRows.includes(r.refNumber)
                      )
                    }
                    onChange={toggleSelectAll}
                    className="h-4 w-4"
                  />
                </th>
                <th className="border-b border-slate-100 px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Reference
                </th>
                <th className="border-b border-slate-100 px-6 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Recipient
                </th>
                <th className="border-b border-slate-100 px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Timestamp
                </th>
                <th className="border-b border-slate-100 px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Subject
                </th>
                <th className="border-b border-slate-100 px-8 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Remarks
                </th>
                <th className="border-b border-slate-100 px-8 py-5 text-center text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-32 text-center font-black italic text-slate-200 animate-pulse"
                  >
                    Synchronizing...
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const isExpanded = expandedRows.has(row.refNumber);
                  const isSaving = !!savingRemarks[row.refNumber];
                  const isDeleting = !!deletingRows[row.refNumber];
                  const formatted = formatDate(row.dateReceived);
                  const [datePart, timePart] = formatted.includes(",")
                    ? formatted.split(",")
                    : [formatted, ""];

                  return (
                    <tr
                      key={row.refNumber || idx}
                      className="group transition-all duration-200 hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-6 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row.refNumber)}
                          onChange={() => toggleRowSelection(row.refNumber)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="relative px-8 py-6 align-top">
                        <div className="absolute bottom-0 left-0 top-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100" />
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          {row.refNumber || "---"}
                        </span>
                      </td>

                      <td className="px-6 py-6 align-top text-center font-bold text-slate-900">
                        {row.receivedFrom || "---"}
                      </td>

                      <td className="px-6 py-6 align-top">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 text-center">
                            {datePart || "---"}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 text-center">
                            {timePart ? timePart.trim() : ""}
                          </span>
                        </div>
                      </td>

                      <td className="px-8 py-6 align-top">
                        <p
                          className={`cursor-pointer text-[15px] font-bold leading-snug text-slate-800 ${
                            isExpanded ? "" : "line-clamp-2"
                          }`}
                          onClick={() => toggleRow(row.refNumber)}
                        >
                          {row.subject || "---"}
                        </p>
                      </td>

                      <td className="px-8 py-6 align-top text-center">
                        <div className="flex items-center justify-center gap-2">
                          <select
                            value={row.remarks || ""}
                            onChange={(e) => updateRemark(row.refNumber, e.target.value)}
                            disabled={isSaving || isDeleting}
                            className={`min-w-[120px] rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider outline-none transition ${
                              isSaving || isDeleting ? "opacity-60" : ""
                            } ${getStatusStyles(row.remarks)}`}
                          >
                            <option value="">No Remark</option>
                            {remarkOptions
                              .filter(Boolean)
                              .map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                          </select>

                          {isSaving && (
                            <span className="text-[10px] font-bold text-slate-400">Saving...</span>
                          )}
                        </div>
                      </td>

                      <td className="px-8 py-6 align-top text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openTimeline(row.refNumber)}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-600 hover:bg-emerald-100"
                          >
                            {loadingTimeline === row.refNumber ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              setViewModal({
                                isOpen: true,
                                link: row.fileLink,
                                title: row.subject,
                              })
                            }
                            disabled={!row.fileLink}
                            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-blue-600 transition hover:bg-blue-100 disabled:opacity-40"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openForwardModal(row.refNumber)}
                            disabled={isDeleting || isSaving}
                            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-50"
                          >
                            <Send className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => deleteRecord(row.refNumber)}
                            disabled={isDeleting || isSaving}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 p-8">
          <div className="flex h-10 w-24 items-center justify-center rounded-xl border border-slate-200 bg-white font-black text-slate-900 shadow-sm">
            {page} <span className="mx-2 font-light text-slate-300">/</span> {totalPages}
          </div>

          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => {
                setPage((p) => p - 1);
                tableContainerRef.current?.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm disabled:opacity-20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              disabled={page >= totalPages}
              onClick={() => {
                setPage((p) => p + 1);
                tableContainerRef.current?.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg disabled:opacity-20"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}