const SPREADSHEET_ID = "1LwZjTv-sEWG_QlmQTXey-xF-HmfPgML0hOgYxRdseVg";
const SHEET_NAME = "Sheet1";
const CACHE_SECONDS = 900;

// ==============================
// FAST SPREADSHEET CACHE
// ==============================

let SS_CACHE = null;

function getSS() {

  if (!SS_CACHE) {

    SS_CACHE =
      SpreadsheetApp.openById(
        SPREADSHEET_ID
      );

  }

  return SS_CACHE;

}

function jsonResponse(data){

  return ContentService
  .createTextOutput(
    JSON.stringify(data)
  )
  .setMimeType(
    ContentService.MimeType.JSON
  );

}

function getSheet(sheetName) {

  return getSS()
    .getSheetByName(
      sheetName || SHEET_NAME
    );

}

function invalidateDataCaches(sheetName) {
  const cache = CacheService.getScriptCache();
  const keys = [
    "commtrack_data_" + (sheetName || SHEET_NAME)
  ];

  if ((sheetName || SHEET_NAME) === SHEET_NAME) {
    keys.push("dashboard_fast");
  }

  cache.removeAll(keys);
}

/**
 * Appends an action to a two-column log sheet.
 * Expected headers: Message | Timestamp
 */
function saveActionLog(
  sheetName,
  refNumber,
  message,
  updatedBy
) {
  const ss = getSS();
  let logSheet = ss.getSheetByName(sheetName);

  if (!logSheet) {
    logSheet = ss.insertSheet(sheetName);
    logSheet.appendRow(["Message", "Timestamp"]);
  }

  const actor =
    String(updatedBy || "").trim() ||
    Session.getActiveUser().getEmail() ||
    "Unknown User";

  const logMessage =
    `[${String(refNumber || "").trim()}] ` +
    `${String(message || "").trim()} || ${actor}`;

  logSheet.appendRow([
    logMessage,
    new Date()
  ]);
}
function syncLatestReplies() {
  const lock = LockService.getScriptLock();

  // Prevent two synchronization executions from overlapping.
  if (!lock.tryLock(1000)) {
    Logger.log("Another reply synchronization is already running.");
    return;
  }

  try {
    const sheet = getSheet("Notifications");

    if (!sheet) {
      Logger.log("Notifications sheet not found.");
      return;
    }

    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return;
    }

    const headers = data[0].map(
      header => String(header).trim()
    );

    const threadCol = headers.indexOf("Thread ID");
    const timeCol =
      headers.indexOf("Timestamp") !== -1
        ? headers.indexOf("Timestamp")
        : headers.indexOf("Time");

    const senderCol = headers.indexOf("Sender");
    const subjectCol = headers.indexOf("Subject");
    const typeCol = headers.indexOf("Type");

    const messageCol =
      headers.indexOf("Message") !== -1
        ? headers.indexOf("Message")
        : headers.indexOf("Body");

    const linkCol = headers.indexOf("Link");

    if (threadCol === -1 || timeCol === -1) {
      Logger.log("Thread ID or Timestamp column is missing.");
      return;
    }

    /*
     * Create a map of thread IDs to spreadsheet row numbers.
     * This does not call Gmail.
     */
    const rowsByThreadId = new Map();

    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const threadId = String(
        data[rowIndex][threadCol] || ""
      ).trim();

      if (!threadId) {
        continue;
      }

      if (!rowsByThreadId.has(threadId)) {
        rowsByThreadId.set(threadId, []);
      }

      rowsByThreadId.get(threadId).push(rowIndex);
    }

    /*
     * Only search for Gmail activity since the previous synchronization.
     * Include a five-minute overlap in case a message arrived while the
     * previous execution was finishing.
     */
    const properties = PropertiesService.getScriptProperties();
    const nowSeconds = Math.floor(Date.now() / 1000);

    const previousSync = Number(
      properties.getProperty("LAST_REPLY_SYNC_SECONDS")
    );

    const searchAfter = previousSync
      ? Math.max(previousSync - 300, nowSeconds - 86400)
      : nowSeconds - 86400;

    const query = `in:anywhere after:${searchAfter}`;

    // Process at most 100 recently active threads per execution.
    const recentThreads = GmailApp.search(query, 0, 100);

    let updatedRows = 0;
    const changedRowIndexes = [];
    const writableColumns = [
      timeCol,
      senderCol,
      subjectCol,
      messageCol,
      typeCol,
      linkCol
    ].filter(column => column !== -1);
    const firstWritableColumn = Math.min.apply(null, writableColumns);
    const lastWritableColumn = Math.max.apply(null, writableColumns);

    recentThreads.forEach(thread => {
      const threadId = String(thread.getId()).trim();
      const matchingRows = rowsByThreadId.get(threadId);

      // Ignore Gmail threads that are not tracked in Notifications.
      if (!matchingRows || !matchingRows.length) {
        return;
      }

      const messages = thread.getMessages();

      if (!messages.length) {
        return;
      }

      const latestMessage = messages[messages.length - 1];
      const latestDate = latestMessage.getDate();
      const latestSubject = latestMessage.getSubject() || "";
      const latestSender = latestMessage.getFrom() || "";
      const latestBody = (
        latestMessage.getPlainBody() || ""
      ).substring(0, 500);

      const normalizedSubject = latestSubject.toLowerCase();

      const latestType =
        normalizedSubject.includes("fwd:") ||
        normalizedSubject.includes("fw:")
          ? "Forwarded"
          : "Reply";

      matchingRows.forEach(rowIndex => {
        const storedDate = new Date(data[rowIndex][timeCol]);
        const storedTime = storedDate.getTime();

        if (
          !Number.isNaN(storedTime) &&
          latestDate.getTime() <= storedTime
        ) {
          return;
        }

        data[rowIndex][timeCol] = latestDate;
        if (senderCol !== -1) data[rowIndex][senderCol] = latestSender;
        if (subjectCol !== -1) data[rowIndex][subjectCol] = latestSubject;
        if (messageCol !== -1) data[rowIndex][messageCol] = latestBody;
        if (typeCol !== -1) data[rowIndex][typeCol] = latestType;
        if (linkCol !== -1) data[rowIndex][linkCol] = thread.getPermalink();

        changedRowIndexes.push(rowIndex);
        updatedRows++;
      });
    });

    /*
     * Write changed rows in contiguous blocks. This replaces as many as six
     * setValue calls per row with one setValues call per block.
     */
    const uniqueRows = Array.from(new Set(changedRowIndexes))
      .sort((first, second) => first - second);

    for (let start = 0; start < uniqueRows.length;) {
      let end = start;

      while (
        end + 1 < uniqueRows.length &&
        uniqueRows[end + 1] === uniqueRows[end] + 1
      ) {
        end++;
      }

      const firstRowIndex = uniqueRows[start];
      const lastRowIndex = uniqueRows[end];
      const blockValues = data
        .slice(firstRowIndex, lastRowIndex + 1)
        .map(row =>
          row.slice(firstWritableColumn, lastWritableColumn + 1)
        );

      sheet.getRange(
        firstRowIndex + 1,
        firstWritableColumn + 1,
        blockValues.length,
        lastWritableColumn - firstWritableColumn + 1
      ).setValues(blockValues);

      start = end + 1;
    }

    properties.setProperty(
      "LAST_REPLY_SYNC_SECONDS",
      String(nowSeconds)
    );

    invalidateDataCaches("Notifications");

    Logger.log(
      `Reply synchronization complete. Updated rows: ${updatedRows}`
    );
  } catch (error) {
    Logger.log(`Reply synchronization error: ${error}`);

    // Allow the next execution to retry the same time period.
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {

    const action =
      e &&
      e.parameter &&
      e.parameter.action
        ? e.parameter.action
        : "";
        // FAST DASHBOARD
      if (action === "getDashboardData") {

        return getDashboardData();

      }
      // GET REPLY NOTIFICATIONS
if (action === "getNotifications") {

  return getNotifications();

}
                  
    // GET ALL COMMUNICATION RECORDS
    if (action === "getRecords") {

      return getRecords();

    }
    // GET OFFICE LIST FOR FORWARD MODAL
if (action === "getOffices") {
  return jsonResponse(getOffices());
}

    // GET SUC LIST FOR FORWARD MODAL
    if (action === "getSucs") {

      return ContentService
        .createTextOutput(
          JSON.stringify(getSucs())
        )
        .setMimeType(
          ContentService.MimeType.JSON
        );

    }
    // GET STATUS TIMELINE
if (action === "getTimeline") {

  return ContentService
    .createTextOutput(
      JSON.stringify(
        getTimeline(
          e.parameter.refNumber
        )
      )
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}


    const sheetName =
  (e && e.parameter && e.parameter.sheet)
    ? e.parameter.sheet
    : SHEET_NAME;

const cacheKey =
  "commtrack_data_" + sheetName;
    const cache = CacheService.getScriptCache();
    const cached = cache.get(cacheKey);

    if (cached) {
      return ContentService
        .createTextOutput(cached)
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = getSheet(sheetName);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();

    if (lastRow < 2 || lastColumn < 1) {
      return ContentService
        .createTextOutput("[]")
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
    const headers = data[0];
    const rows = data.slice(1);

    const result = rows
      .filter(row => row.some(cell => cell !== "" && cell !== null))
      .map(row => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = row[i];
        });
        return obj;
      });

    const json = JSON.stringify(result);

    if (json.length < 90000) {
      cache.put(cacheKey, json, CACHE_SECONDS);
    }

    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    Logger.log(body);
    if (body.action === "login") {
  return login(body);
}

    if (body.action === "updateRemark") {
  return updateRemark(body);
}

if (body.action === "deleteRecord") {
  return deleteRecord(body);
}

if (body.action === "deleteMultipleRecords") {
  return deleteMultipleRecords(body);
}
if (body.action === "updateMultipleRemarks") {
  return updateMultipleRemarks(body);
}

if (body.action === "forwardRecord") {
  return forwardRecord(body);
}
if (body.action === "assignPersonnel") {
  return assignPersonnel(body);
}
if (body.action === "sendAcknowledgementEmail") {
  try {
    sendAcknowledgementEmail(
  body.to,
  body.subject,
  body.threadId
);

    return jsonResponse({
      success: true,
      message: "Acknowledgement email sent successfully"
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: String(error)
    });
  }
}

if (body.action === "getOriginalCc") {
  return getOriginalCc(body);
}

if (body.action === "getSUCList") {
  return ContentService
    .createTextOutput(JSON.stringify(getSUCList()))
    .setMimeType(ContentService.MimeType.JSON);
}
if (body.action === "getTimeline") {

  return ContentService
    .createTextOutput(
      JSON.stringify(
        getTimeline(body.refNumber)
      )
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}

    const to = body.to;
    const cc = body.cc || "";
    const subject = body.subject || "";
    const message = body.message || "";
    const attachments = body.attachments || [];

    if (!to || !subject || !message) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: "Missing to, subject, or message"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const blobs = attachments.map(file => {
      const bytes = Utilities.base64Decode(file.data);
      return Utilities.newBlob(bytes, file.type, file.name);
    });

    GmailApp.sendEmail(to, subject, message, {
      cc: cc,
      htmlBody: message.replace(/\n/g, "<br>"),
      attachments: blobs
    });

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: "Email sent successfully!"
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function updateRemark(body) {
  try {

    const refNumber =
      String(body.refNumber || "").trim();

    const remarks =
      String(body.remarks || "").trim();

    const oldRemarks =
      String(body.oldRemarks || "").trim();

    const updatedBy =
      String(body.updatedBy || "Unknown User").trim();

    const sheetName =
      body.sheet || SHEET_NAME;


    if (!refNumber) {
      return jsonResponse({
        success:false,
        error:"Missing refNumber"
      });
    }


    const sheet = getSheet(sheetName);

    if (!sheet) {
      return jsonResponse({
        success:false,
        error:"Sheet not found"
      });
    }


    const data =
      sheet.getDataRange().getValues();

    const headers =
      data[0].map(h => String(h).trim());


    const refCol =
      headers.indexOf("Ref number");

    const remarksCol =
      headers.indexOf("Remarks");

    const threadCol =
      headers.indexOf("Thread ID");

    const subjectCol =
      headers.indexOf("Subject");


    if (
      refCol === -1 ||
      remarksCol === -1
    ) {

      return jsonResponse({
        success:false,
        error:"Required columns missing"
      });

    }


    for (
      let i = 1;
      i < data.length;
      i++
    ) {


      const currentRef =
        String(data[i][refCol]).trim();


      if (currentRef === refNumber) {


        // UPDATE REMARK
        sheet
          .getRange(
            i + 1,
            remarksCol + 1
          )
          .setValue(remarks);



        // SAVE TIMELINE
        saveRemarkTimeline(
          refNumber,
          oldRemarks,
          remarks,
          updatedBy
        );



        let emailSent = false;
        let emailError = "";


        const emailRemarks = [
          "acknowledge",
          "invitations",
          "for action",
          "approved",
          "disapproved"
        ];


        const normalizedOldStatus =
  String(oldRemarks || "")
    .trim()
    .toLowerCase();

const normalizedNewStatus =
  String(remarks || "")
    .trim()
    .toLowerCase();

const shouldSendEmail =
  normalizedOldStatus !== normalizedNewStatus &&
  emailRemarks.includes(normalizedNewStatus);

if (shouldSendEmail) {


          if (
            threadCol !== -1 &&
            data[i][threadCol]
          ) {


            try {

              const threadId =
                String(
                  data[i][threadCol]
                ).trim();


              const subject =
                subjectCol !== -1
                ? data[i][subjectCol]
                : "";


              sendRemarkUpdateEmail(
                threadId,
                refNumber,
                subject,
                oldRemarks,
                remarks
              );


              emailSent = true;


            } catch(err) {

              emailError =
                err.toString();

              Logger.log(
                "EMAIL FAILED: " +
                emailError
              );

            }


          } else {


            emailError =
              "No Thread ID";


            Logger.log(
              "No Thread ID for " +
              refNumber
            );


          }

        }



        invalidateDataCaches(sheetName);



        return jsonResponse({

          success:true,

          emailSent,

          emailError,

          message:
            emailSent
            ? "Remarks updated and email sent"
            : "Remarks updated only"

        });


      }

    }



    return jsonResponse({
      success:false,
      error:"Ref number not found"
    });


  } catch(error) {


    return jsonResponse({

      success:false,

      error:
        error.toString()

    });


  }
}

function saveRemarkTimeline(
  refNumber,
  oldStatus,
  newStatus,
  updatedBy
){

  try {

    // skip duplicate status
    if (
      String(oldStatus)
        .trim()
        .toLowerCase()
      ===
      String(newStatus)
        .trim()
        .toLowerCase()
    ) {
      return;
    }


    const ss = getSS();


    let timelineSheet =
      ss.getSheetByName(
        "Timeline"
      );


    // create Timeline sheet if missing
    if (!timelineSheet) {

      timelineSheet =
        ss.insertSheet(
          "Timeline"
        );


      timelineSheet.appendRow([
  "Timestamp",
  "Old Status",
  "New Status",
  "Ref number",
  "Updated By"
]);

    }


    timelineSheet.appendRow([
  new Date(),

  oldStatus ||
  "No Status",

  newStatus,

  refNumber,

  updatedBy ||
  "Unknown User"
]);


    Logger.log(
      "Timeline saved: " +
      refNumber
    );


  } catch(err) {

    Logger.log(
      "Timeline error: " +
      err
    );

  }

}


function sendRemarkUpdateEmail(
  threadId,
  refNumber,
  subject,
  oldStatus,
  newStatus
) {

  const templates = {

    acknowledge: `
      Please be informed that your email/inquiry has been processed and recorded by this Office.
      Kindly refer to the current status below for your guidance.
    `,

    invitations: `
      This Office acknowledges receipt of your invitation addressed to Commissioner Desiderio R. Apag III.
      We extend our appreciation for considering the Commissioner's participation in your forthcoming event.
      Please be advised that the said invitation shall be duly relayed and presented to the Commissioner for his information and appropriate consideration.
      <br>
      In this connection, may we respectfully request the submission of a brief background or rationale of the event, together with the proposed program or agenda, if already available. These supporting details will greatly aid this Office in the proper evaluation and processing of your request.
    `,

    "for action": `
      This communication has been forwarded to the concerned office for appropriate action.

      Kindly take the necessary action and keep this Office informed of any developments regarding this matter.
    `,

    approved: `
      Please be informed that your request has been approved.

      Kindly refer to the details below for your guidance.
    `,

    disapproved: `
      Please be informed that your request has been disapproved.

      Kindly refer to the details below for your guidance.
    `

  };


  const key =
    String(newStatus)
      .trim()
      .toLowerCase();


  if (!templates[key]) {

    Logger.log(
      "NO EMAIL TEMPLATE FOR: " + key
    );

    return;
  }


  Logger.log(
    "THREAD ID USED: " + threadId
  );


  const html = `

<div style="
  margin:0;
  padding:0;
  background:#f4f7fb;
  font-family:Arial, Helvetica, sans-serif;
  color:#1f2937;
">

  <div style="
    max-width:650px;
    margin:30px auto;
    background:#ffffff;
    border-radius:14px;
    overflow:hidden;
    border:1px solid #e5e7eb;
    box-shadow:0 8px 25px rgba(0,0,0,0.08);
  ">

    <!-- HEADER -->
<div style="background:#ffffff;padding:28px 35px 20px;">

  <table 
    width="100%" 
    cellpadding="0" 
    cellspacing="0"
    style="border-collapse:collapse;">
    <tr>

      <!-- CHED LOGO -->
      <td 
        width="20%" 
        align="left"
        style="vertical-align:middle;">
        <img
          src="https://chedcar.com/wp-content/uploads/2020/09/Commission_on_Higher_Education_CHEd.svg_.png"
          style="
            width:90px;
            height:auto;
            display:block;
          "
        />
      </td>


      <!-- CENTER TEXT -->
      <td 
        width="60%"
        align="center"
        style="
          vertical-align:middle;
          font-family:'Times New Roman', serif;
        "
      >

        <div style="
          font-size:19px;
          font-weight:bold;
          color:#000;
          white-space:nowrap;
        ">
          COMMISSION ON HIGHER EDUCATION
        </div>


        <div style="
          margin-top:1px;
          font-size:16px;
          font-weight:bold;
          color:#000068;
        ">
          Office of Commissioner Desiderio R. Apag III
        </div>
      </td>


      <!-- BAGONG PILIPINAS -->
      <td 
        width="20%" 
        align="right"
        style="vertical-align:middle;"
      >
        <img
          src="https://stateofthenation.gov.ph/wp-content/uploads/2024/06/Bagong-Pilipinas-Logo.png"
          style="
            width:95px;
            height:auto;
            display:block;
            margin-left:auto;
          "
        />
      </td>
    </tr>
  </table>


  <!-- BLUE LINE -->
  <div style="
    margin-top:28px;
    border-top:4px double #000068;
  ">
  </div>


  <!-- EMAIL TITLE -->
  <div style="
    margin-top:20px;
    text-align:center;
    font-family:Arial, Helvetica, sans-serif;
  ">

    <h2 style="
      margin:0;
      font-size:20px;
      color:#000068;
      font-weight:700;
    ">
      Communication Status Update
    </h2>

  </div>

</div>

    <!-- BODY -->
    <div style="padding:28px;">

      <p style="
        margin-top:0;
        font-size:15px;
      ">
        Greetings!
      </p>

      <p style="
        font-size:15px;
        line-height:1.7;
        color:#374151;
      ">
        ${templates[key]}
      </p>

      <!-- DETAILS CARD -->
      <div style="
        margin:25px 0;
        background:#f9fafb;
        border-radius:12px;
        border:1px solid #e5e7eb;
        overflow:hidden;
      ">

        <div style="
          padding:14px 18px;
          border-bottom:1px solid #e5e7eb;
        ">
          <div style="
            font-size:12px;
            color:#6b7280;
            margin-bottom:4px;
          ">
            Reference Number
          </div>

          <div style="
            font-weight:700;
            color:#111827;
            font-size:15px;
          ">
            ${refNumber}
          </div>
        </div>
        <div style="
          padding:14px 18px;
          border-bottom:1px solid #e5e7eb;
        ">
          <div style="
            font-size:12px;
            color:#6b7280;
            margin-bottom:4px;
          ">
            Subject
          </div>
          <div style="
            color:#111827;
            font-size:15px;
          ">
            ${subject}
          </div>
        </div>
        <div style="
          padding:14px 18px;
        ">
          <div style="
            font-size:12px;
            color:#6b7280;
            margin-bottom:8px;
          ">
            Current Status
          </div>
          <span style="
            display:inline-block;
            background:#dbeafe;
            color:#000068;
            padding:7px 14px;
            border-radius:999px;
            font-size:13px;
            font-weight:700;
          ">
            ${newStatus}
          </span>
        </div>
      </div>
      <p style="
        margin-top:28px;
        font-size:15px;
        line-height:1.7;
        color:#374151;
      ">
        Should you require further clarification or immediate assistance,
        you may contact our office at 
        <b style="color:#111827;">02 8441 1173</b>.
      </p>


      <p style="
        margin-top:35px;
        margin-bottom:0;
        font-size:15px;
        color:#111827;
      ">
        Respectfully,
      </p>


      <p style="
            margin-top:28px;
            margin-bottom:0;
            font-size:18px;
            font-weight:800;
            color:#000068;
            font-family:'Times New Roman',serif;
          ">
            Desiderio R. Apag III, PCpE, D.Eng., ASEAN Eng.
          </p>

          <p style="
            margin-top:4px;
            margin-bottom:0;
            font-size:16px;
            font-weight:600;
            color:#374151;
            font-family:'Times New Roman',serif;
          ">
            Commissioner
          </p>
    </div>
    <!-- FOOTER -->
    <div style="
      background:#f9fafb;
      padding:16px 28px;
      text-align:center;
      border-top:1px solid #e5e7eb;
      font-size:12px;
      color:#6b7280;
    ">
      © ${new Date().getFullYear()} Communication Hub ©
      <br>
      Office of Commissioner Desiderio R. Apag III
    </div>
  </div>
</div>
`;


 // ===============================
// SEND REMARK EMAIL USING GMAIL API
// ===============================

const gmailThread =
  Gmail.Users.Threads.get(
    "me",
    String(threadId).trim()
  );


if (
  !gmailThread ||
  !gmailThread.messages ||
  gmailThread.messages.length === 0
) {

  throw new Error(
    "Gmail API thread not found"
  );

}


// GET ORIGINAL EMAIL
const originalMessage =
  gmailThread.messages[0];


const headers =
  originalMessage.payload.headers;


// ORIGINAL SENDER
const fromHeader =
  headers.find(
    h =>
      h.name.toLowerCase() === "from"
  );


const messageIdHeader =
  headers.find(
    h =>
      h.name.toLowerCase() === "message-id"
  );


if (!fromHeader) {

  throw new Error(
    "Original sender missing"
  );

}


const to =
  fromHeader.value;


const messageId =
  messageIdHeader
    ? messageIdHeader.value
    : "";


// BUILD EMAIL
const rawMessage =
[
  `To: ${to}`,

  `Subject: Re: ${subject || "Communication Status Update"}`,

  `In-Reply-To: ${messageId}`,

  `References: ${messageId}`,

  `MIME-Version: 1.0`,

  `Content-Type: text/html; charset=UTF-8`,

  "",

  html

].join("\r\n");



// ENCODE
const encodedMessage =
  Utilities
    .base64EncodeWebSafe(
      rawMessage
    )
    .replace(/=+$/, "");


// SEND USING GMAIL API
Gmail.Users.Messages.send(
  {
    raw: encodedMessage,

    threadId:
      String(threadId).trim()
  },
  "me"
);


Logger.log(
  "REMARK EMAIL SENT VIA GMAIL API TO: " +
  to
);

}
function updateMultipleRemarks(body) {

  try {
    const updates = body.updates || [];
    const remarks = String(body.remarks || "").trim();
    const sheetName = body.sheet ||  SHEET_NAME;

    if ( !Array.isArray(updates) || updates.length === 0) {
      return jsonResponse({
        success:false,
        error:"No records selected"
      });
    }
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const refCol = headers.indexOf("Ref number");
    const remarksCol = headers.indexOf("Remarks");
    const threadCol = headers.indexOf("Thread ID");
    const subjectCol = headers.indexOf("Subject");
    if (refCol === -1 || remarksCol === -1) {
      throw new Error(
        "Required columns missing"
      );
    }
    const emailRemarks = [
      "acknowledge",
      "invitations",
      "for action",
      "approved",
      "disapproved"
    ];
    const sendEmail =
      emailRemarks.includes(
        remarks
        .toLowerCase()
        .trim()
      );
    const updateMap = new Map();
    updates.forEach(
      item => {
        updateMap.set(
          String(item.refNumber).trim(), String(item.oldRemarks || "")
        );
      }
    );
    const range = sheet.getRange( 2,remarksCol + 1,data.length - 1,1);
    const values = range.getValues();
    let updated = 0;
    let emailsSent = 0;
    for (let i = 0; i < values.length;i++) {
      const row = data[i + 1];
      const ref = String(row[refCol]).trim();

      if (updateMap.has(ref) ) {
        const oldStatus =
          updateMap.get(ref);

        // UPDATE SHEET
        values[i][0] =
          remarks;

        // SAVE HISTORY
        saveRemarkTimeline(
          ref,
          oldStatus,
          remarks,
          body.updatedBy || "Unknown User"
        );
        // SEND EMAIL
        const normalizedOldStatus =
  String(oldStatus || "")
    .trim()
    .toLowerCase();

const normalizedNewStatus =
  String(remarks || "")
    .trim()
    .toLowerCase();

const statusActuallyChanged =
  normalizedOldStatus !== normalizedNewStatus;

if (
  statusActuallyChanged &&
  sendEmail &&
  threadCol !== -1 &&
  row[threadCol]
) {
          try {
            const threadId = String(row[threadCol]).trim();
            const subject = subjectCol !== -1 ? row[subjectCol]: "";
              
              sendRemarkUpdateEmail(
              threadId,
              ref,
              subject,
              oldStatus,
              remarks
            );
            emailsSent++;
          } catch(err) {
            Logger.log("Email failed for " + ref + ": " +err);
          }
        }
        updated++;
      }
    }
    range.setValues(values);
    invalidateDataCaches(sheetName);
    return jsonResponse({
      success:true,
      updated,
      emailsSent
    });
  } catch(err) {
    return jsonResponse({
      success:false,
      error:String(err)
    });
  }
}

function extractDriveFileIds(text) {
  const value = String(text || "").trim();
  if (!value) return [];

  const parts = value.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
  const ids = [];

  parts.forEach(part => {
    let match = part.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) ids.push(match[1]);

    match = part.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) ids.push(match[1]);

    if (/^[a-zA-Z0-9_-]{20,}$/.test(part)) {
      ids.push(part);
    }
  });

  return [...new Set(ids)];
}
function getDriveAttachmentsFromRow(rowValues, headers) {
  const possibleColumns = [
  "File Links",
  "File Link",
  "Previous File",
  "URL",
  "Url",
  "Links",
  "Link"
];

  const attachments = [];
  const seenIds = new Set();

  possibleColumns.forEach(columnName => {
    const index = headers.indexOf(columnName);

    if (index === -1 || !rowValues[index]) {
      return;
    }

    const fileIds = extractDriveFileIds(rowValues[index]);

    fileIds.forEach(fileId => {
      if (seenIds.has(fileId)) {
        return;
      }

      try {
        const file = DriveApp.getFileById(fileId);
        attachments.push(file.getBlob().setName(file.getName()));
        seenIds.add(fileId);
      } catch (error) {
        Logger.log(
          `Could not retrieve Drive file ${fileId}: ${error}`
        );
      }
    });
  });

  return attachments;
}
function mergeUniqueAttachments() {
  const merged = [];
  const seen = new Set();

  Array.from(arguments).forEach(group => {
    (group || []).forEach(file => {
      const name =
        String(file.getName() || "attachment").trim();

      const contentType =
        String(
          file.getContentType() ||
          "application/octet-stream"
        );

      const bytes = file.getBytes();

      // Prevent the same Gmail/Drive file from appearing twice.
      const key =
        name.toLowerCase() +
        "|" +
        contentType.toLowerCase() +
        "|" +
        bytes.length;

      if (!seen.has(key)) {
        seen.add(key);
        merged.push(file);
      }
    });
  });

  return merged;
}
function trashDriveFilesFromRow(rowValues, headers) {
  const possibleColumns = ["File Links", "Previous File", "URL", "Url", "Links"];

  possibleColumns.forEach((colName) => {
    const idx = headers.indexOf(colName);
    if (idx !== -1) {
      const ids = extractDriveFileIds(rowValues[idx]);
      ids.forEach((fileId) => {
        try {
          DriveApp.getFileById(fileId).setTrashed(true);
        } catch (err) {
          console.error("Drive delete skipped for:", fileId, err);
        }
      });
    }
  });
}

function deleteRecord(body) {
  try {
    const refNumber = String(body.refNumber || "").trim();
    const sheetName = body.sheet || SHEET_NAME;

    if (!refNumber) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: "Missing refNumber"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = getSheet(sheetName);
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: "Sheet not found"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: "No data found"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = data[0].map(h => String(h).trim());
    const refColIndex = headers.indexOf("Ref number");
    const threadColIndex = headers.indexOf("Thread ID");
    const messageColIndex = headers.indexOf("Message ID");

    if (refColIndex === -1) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'Column "Ref number" not found'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    let deletedRow = -1;
    let threadId = "";
    let messageId = "";

    for (let i = 1; i < data.length; i++) {
      const currentRef = String(data[i][refColIndex]).trim();
      if (currentRef === refNumber) {
        deletedRow = i + 1;

        if (threadColIndex !== -1) {
          threadId = String(data[i][threadColIndex] || "").trim();
        }

        if (messageColIndex !== -1) {
          messageId = String(data[i][messageColIndex] || "").trim();
        }

        trashDriveFilesFromRow(data[i], headers);
        break;
      }
    }

    if (deletedRow === -1) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: "Ref number not found"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    try {
      if (threadId) {
        const thread = GmailApp.getThreadById(threadId);
        if (thread) thread.moveToTrash();
      } else if (messageId) {
        const message = GmailApp.getMessageById(messageId);
        if (message) message.getThread().moveToTrash();
      }
    } catch (gmailError) {
      console.error("Gmail delete skipped:", gmailError);
    }

    sheet.deleteRow(deletedRow);

    invalidateDataCaches(sheetName);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: "Row and related files deleted successfully"
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
function deleteMultipleRecords(body) {

  try {

    const refNumbers = body.refNumbers || [];
    const sheetName = body.sheet || SHEET_NAME;

    if (!Array.isArray(refNumbers) || !refNumbers.length) {

      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "No selected records."
      })).setMimeType(ContentService.MimeType.JSON);

    }

    const sheet = getSheet(sheetName);

    const data = sheet.getDataRange().getValues();

    const headers = data[0].map(String);

    const refCol = headers.indexOf("Ref number");
    const threadCol = headers.indexOf("Thread ID");
    const messageCol = headers.indexOf("Message ID");

    if (refCol === -1) {

      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Ref number column not found."
      })).setMimeType(ContentService.MimeType.JSON);

    }

    const selected = new Set(
      refNumbers.map(r => String(r).trim())
    );

    let deleted = 0;

    for (let i = data.length - 1; i >= 1; i--) {

      const ref = String(data[i][refCol]).trim();

      if (!selected.has(ref)) continue;

      const rowValues = data[i];

      // Delete Drive files
      trashDriveFilesFromRow(rowValues, headers);

      // Delete Gmail
      try {

        if (threadCol !== -1 && rowValues[threadCol]) {

          const thread = GmailApp.getThreadById(rowValues[threadCol]);

          if (thread) thread.moveToTrash();

        } else if (messageCol !== -1 && rowValues[messageCol]) {

          const msg = GmailApp.getMessageById(rowValues[messageCol]);

          if (msg) msg.getThread().moveToTrash();

        }

      } catch (e) {
        Logger.log(e);
      }

      sheet.deleteRow(i + 1);

      deleted++;

    }

    invalidateDataCaches(sheetName);

    return ContentService.createTextOutput(JSON.stringify({

      success: true,

      deleted

    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {

    return ContentService.createTextOutput(JSON.stringify({

      success: false,

      error: err.toString()

    })).setMimeType(ContentService.MimeType.JSON);

  }

}

function splitEmails(value) {
  return String(value || "")
    .split(/[,\n;]/)
    .map(s => s.trim())
    .filter(Boolean);
}

function mergeEmails() {
  const seen = new Set();
  const out = [];

  for (const group of arguments) {
    splitEmails(group).forEach(email => {
      const key = email.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(email);
      }
    });
  }

  return out.join(",");
}

function htmlEscape(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function forwardRecord(body) {
  try {
    const refNumber = String(body.refNumber || "").trim();
    const forwardTo = String(body.to || body.forwardTo || "").trim();
    const forwardCc = String(body.cc || body.forwardCc || "").trim();
    const customSubject = String(body.subject || "").trim();
    const sheetName = body.sheet || SHEET_NAME;

    if (!refNumber) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: "Missing refNumber"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (!forwardTo) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: "Missing forward recipient"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = getSheet(sheetName);
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: "Sheet not found"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: "No data found"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = data[0].map(h => String(h).trim());
    const refColIndex = headers.indexOf("Ref number");
    const threadColIndex = headers.indexOf("Thread ID");
    const messageColIndex = headers.indexOf("Message ID");

    if (refColIndex === -1) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'Column "Ref number" not found'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    let threadId = "";
let messageId = "";
let rowValues = null;
let recordRowNumber = -1;

    for (let i = 1; i < data.length; i++) {
      const currentRef = String(data[i][refColIndex]).trim();
      if (currentRef === refNumber) {
        rowValues = data[i];
recordRowNumber = i + 1;
        if (threadColIndex !== -1) {
          threadId = String(data[i][threadColIndex] || "").trim();
        }

        if (messageColIndex !== -1) {
          messageId = String(data[i][messageColIndex] || "").trim();
        }

        break;
      }
    }

    if (!rowValues) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: "Ref number not found"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    let originalMessage = null;
let attachments = [];

/*
 * The stored Message ID should point to the original incoming email.
 * Use it before Thread ID because the latest thread message may be one
 * of CommTrack's system-generated status notifications.
 */
if (messageId) {
  try {
    originalMessage = GmailApp.getMessageById(messageId);

    if (originalMessage) {
      attachments = originalMessage.getAttachments({
        includeInlineImages: false,
        includeAttachments: true
      });
    }
  } catch (messageError) {
    Logger.log(
      `Could not retrieve stored Message ID ${messageId}: ${messageError}`
    );
    originalMessage = null;
    attachments = [];
  }
}

/*
 * Fallback for older spreadsheet records whose Message ID is missing
 * or invalid: search the thread for the original attachment-bearing
 * message instead of automatically using the latest message.
 */
if (threadId && (!originalMessage || attachments.length === 0)) {
  const thread = GmailApp.getThreadById(threadId);

  if (!thread) {
    throw new Error(`Gmail thread not found: ${threadId}`);
  }

  const messages = thread.getMessages();

  if (!messages.length) {
    throw new Error(`No messages found in Gmail thread: ${threadId}`);
  }

  // Prefer the exact stored message when it exists in the thread.
  const storedMessage = messageId
    ? messages.find(message =>
        String(message.getId()).trim() === messageId
      )
    : null;

  // Otherwise, find the first message containing real file attachments.
  const attachmentMessage = messages.find(message => {
    const files = message.getAttachments({
      includeInlineImages: false,
      includeAttachments: true
    });

    return files.length > 0;
  });

  /*
   * Priority:
   * 1. Stored original message, if it has attachments
   * 2. First attachment-bearing message
   * 3. Stored message even without attachments
   * 4. First message in the thread
   *
   * Do not use the latest message because it may be a generated
   * CommTrack notification.
   */
  const storedMessageAttachments = storedMessage
    ? storedMessage.getAttachments({
        includeInlineImages: false,
        includeAttachments: true
      })
    : [];

  if (storedMessage && storedMessageAttachments.length > 0) {
    originalMessage = storedMessage;
    attachments = storedMessageAttachments;
  } else if (attachmentMessage) {
    originalMessage = attachmentMessage;
    attachments = attachmentMessage.getAttachments({
      includeInlineImages: false,
      includeAttachments: true
    });
  } else if (storedMessage) {
    originalMessage = storedMessage;
    attachments = storedMessageAttachments;
  } else if (!originalMessage) {
    originalMessage = messages[0];
    attachments = originalMessage.getAttachments({
      includeInlineImages: false,
      includeAttachments: true
    });
  }
}

/*
 * Always inspect Google Drive, even when the Gmail message
 * already contains attachments.
 */
const driveAttachments =
  getDriveAttachmentsFromRow(
    rowValues,
    headers
  );

attachments = mergeUniqueAttachments(
  attachments,       // Gmail attachments
  driveAttachments   // Google Drive files
);

/*
 * Do not cancel the forward when no attachment exists.
 * The record details and message body can still be sent.
 */
Logger.log(
  `Forward ${refNumber}: ` +
  `${attachments.length} total attachment(s), ` +
  `${driveAttachments.length} from Drive`
);

const subjectColIndex =
  headers.indexOf("Subject");

const senderColIndex =
  headers.findIndex(header =>
    ["received from", "sender", "from"].includes(
      String(header).trim().toLowerCase()
    )
  );

const sheetSubject =
  subjectColIndex !== -1
    ? String(rowValues[subjectColIndex] || "").trim()
    : "";

const sheetSender =
  senderColIndex !== -1
    ? String(rowValues[senderColIndex] || "").trim()
    : "";

Logger.log(
  `Forwarding ${refNumber}: ` +
  `${originalMessage ? "Gmail message found" : "using Drive fallback"}, ` +
  `${attachments.length} attachment(s)`
);

const originalSubject = originalMessage
  ? originalMessage.getSubject() || sheetSubject
  : sheetSubject || "Communication";

const originalFrom = originalMessage
  ? originalMessage.getFrom() || sheetSender
  : sheetSender;

const originalTo = originalMessage
  ? originalMessage.getTo() || ""
  : "";

const originalCc = originalMessage
  ? originalMessage.getCc() || ""
  : "";

const originalDate = originalMessage
  ? originalMessage.getDate()
  : new Date();

const plainBody = originalMessage
  ? originalMessage.getPlainBody() || ""
  : "Please refer to the attached communication.";

const originalHtmlBody = originalMessage
  ? originalMessage.getBody() || ""
  : "<p>Please refer to the attached communication.</p>";


let subject;

if (customSubject) {
  subject = customSubject;
} else {
  subject = /^fwd:/i.test(originalSubject)
    ? originalSubject
    : `Fwd: ${originalSubject}`;
}

const safeRefNumber = htmlEscape(refNumber);
const safeOriginalSubject = htmlEscape(originalSubject);

const messageText = [
  "Dear Sir/Ma’am,",
  "",
  "Maayong Adlaw!",
  "",
  "This Office respectfully forwards the communication received for your information, reference, and appropriate action.",
  "",
  `Reference Number: ${refNumber}`,
  `Subject: ${originalSubject}`,
  "",
  plainBody || "No original message content available.",
  "",
  "Kindly take the necessary action and keep this Office informed of any developments regarding this matter.",
  "",
  "Respectfully,",
  "",
  "DESIDERIO R. APAG III, PCpE, D.Eng., ASEAN Eng.",
  "Commissioner"
].join("\n");

const includeOriginalCc =
  body.includeOriginalCc === true ||
  body.includeOriginalCc === "true";

const finalCc = includeOriginalCc
  ? mergeEmails(originalCc, forwardCc)
  : "";

const htmlBody = `
  <div style="background:#eef2f7;padding:40px 20px;font-family:Arial,Helvetica,sans-serif;">
    <div style="
      max-width:760px;
      margin:auto;
      background:#ffffff;
      border-radius:10px;
      box-shadow:0 6px 20px rgba(0,0,0,0.08);
      overflow:hidden;
    ">

      <!-- HEADER -->
      <div style="padding:25px 30px 10px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="border-collapse:collapse;">
          <tr>
            <td style="vertical-align:top;">
              <p style="margin:0;font-size:14px;font-weight:bold;color:#1e3a8a;">
                OFFICE OF COMMISSIONER DESIDERIO R. APAG III
              </p>

              <p style="margin:4px 0 0;font-size:12px;line-height:1.7;color:#6b7280;">
                Commission on Higher Education<br>
                Higher Education Development Center Building<br>
                C.P. Garcia Avenue, Diliman, Quezon City<br>
                Telefax: (02) 8441-1173
              </p>
            </td>

            <td align="right" style="vertical-align:middle;white-space:nowrap;">
              <img
                src="https://chedcar.com/wp-content/uploads/2020/09/Commission_on_Higher_Education_CHEd.svg_.png"
                alt="CHED Logo"
                style="height:60px;width:auto;margin-right:10px;"
              >

              <img
                src="https://stateofthenation.gov.ph/wp-content/uploads/2024/06/Bagong-Pilipinas-Logo.png"
                alt="Bagong Pilipinas Logo"
                style="height:60px;width:auto;"
              >
            </td>
          </tr>
        </table>
      </div>

      <div style="height:4px;background:#1e3a8a;"></div>

      <!-- BODY -->
      <div style="padding:30px 40px;color:#111827;font-size:14px;line-height:1.7;">
        <p style="margin:0 0 10px;">
          <strong>Dear Sir/Ma’am,</strong>
        </p>

        <p style="margin:0 0 18px;">Maayong Adlaw!</p>

        <p style="margin:0 0 18px;">
          This Office respectfully forwards the communication received for your
          information, reference, and appropriate action.
        </p>

        <!-- COMMUNICATION DETAILS -->
        <div style="
          background:#f8fafc;
          border:1px solid #e5e7eb;
          border-left:6px solid #1e3a8a;
          padding:20px 24px;
          border-radius:6px;
          margin-bottom:25px;
        ">
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="
                width:180px;
                padding:3px 10px 3px 0;
                color:#475569;
                vertical-align:top;
              ">
                <strong>Reference Number:</strong>
              </td>

              <td style="padding:3px 0;color:#0f172a;vertical-align:top;">
                <strong>${safeRefNumber}</strong>
              </td>
            </tr>

            <tr>
              <td style="
                padding:3px 10px 3px 0;
                color:#475569;
                vertical-align:top;
              ">
                <strong>Subject:</strong>
              </td>

              <td style="padding:3px 0;color:#0f172a;vertical-align:top;">
                <strong>${safeOriginalSubject}</strong>
              </td>
            </tr>
          </table>
        </div>

        <!-- ORIGINAL MESSAGE -->
        <div style="
          border:1px dashed #cbd5e1;
          background:#ffffff;
          padding:20px;
          border-radius:6px;
          overflow-wrap:anywhere;
        ">
          ${
            originalHtmlBody ||
            "<p style=\"margin:0;\">No original message content available.</p>"
          }
        </div>

        <p style="margin:25px 0 0;">
          Kindly take the necessary action and keep this Office informed of any
          developments regarding this matter.
        </p>

        <p style="margin:30px 0 0;">Respectfully,</p>

        <div style="margin-top:10px;">
          <p style="margin:0;font-weight:bold;font-size:15px;">
            DESIDERIO R. APAG III, PCpE, D.Eng., ASEAN Eng.
          </p>

          <p style="margin:4px 0 0;color:#475569;font-size:14px;">
            Commissioner
          </p>
        </div>
      </div>

      <!-- FOOTER -->
      <div style="
        background:#f1f5f9;
        padding:15px 20px;
        text-align:center;
        font-size:11px;
        line-height:1.6;
        color:#64748b;
      ">
        This is a system-generated email from COMMTRACKSYS.<br>
        Please do not reply directly to this message.
      </div>
    </div>
  </div>
`;

const originalMessageId = originalMessage
  ? String(
      originalMessage.getHeader("Message-ID") || ""
    ).trim()
  : "";

const effectiveThreadId = threadId
  ? String(threadId).trim()
  : originalMessage
    ? String(originalMessage.getThread().getId()).trim()
    : "";

/*
 * Gmail requires a matching subject, threadId, In-Reply-To,
 * and References for reliable threading.
 *
 * Keep the original subject here. The body still clearly presents
 * this message as a forwarded communication.
 */
const threadedSubject =
  String(originalSubject || subject || "Communication")
    .replace(/[\r\n]+/g, " ")
    .trim();

const boundary =
  "commtrack_mixed_" + Utilities.getUuid().replace(/-/g, "");

const rawHeaders = [
  `To: ${forwardTo}`,
  finalCc ? `Cc: ${finalCc}` : "",
  `Subject: ${threadedSubject}`,
  "MIME-Version: 1.0",
  `Content-Type: multipart/mixed; boundary="${boundary}"`
].filter(Boolean);

if (originalMessageId) {
  rawHeaders.push(
    `In-Reply-To: ${originalMessageId}`,
    `References: ${originalMessageId}`
  );
}

const mimeParts = [
  ...rawHeaders,
  "",
  `--${boundary}`,
  'Content-Type: text/html; charset="UTF-8"',
  "Content-Transfer-Encoding: base64",
  "",
  Utilities.base64Encode(
    Utilities.newBlob(htmlBody, "text/html").getBytes()
  )
];

attachments.forEach(file => {
  const fileName =
    String(file.getName() || "attachment")
      .replace(/[\r\n"]/g, "_");

  const contentType =
    file.getContentType() || "application/octet-stream";

  mimeParts.push(
    `--${boundary}`,
    `Content-Type: ${contentType}; name="${fileName}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${fileName}"`,
    "",
    Utilities.base64Encode(file.getBytes())
  );
});

mimeParts.push(`--${boundary}--`, "");

const encodedEmail =
  Utilities
    .base64EncodeWebSafe(mimeParts.join("\r\n"))
    .replace(/=+$/, "");

const gmailPayload = {
  raw: encodedEmail
};

if (effectiveThreadId) {
  gmailPayload.threadId = effectiveThreadId;
}

const sentForward =
  Gmail.Users.Messages.send(
    gmailPayload,
    "me"
  );

/*
 * Save the newly created Gmail IDs for Drive-only records.
 * Future forwards and assignments will reuse this thread.
 */
if (
  recordRowNumber !== -1 &&
  sentForward
) {
  if (
    threadColIndex !== -1 &&
    !threadId &&
    sentForward.threadId
  ) {
    sheet
      .getRange(
        recordRowNumber,
        threadColIndex + 1
      )
      .setValue(sentForward.threadId);

    threadId = String(sentForward.threadId);
  }

  if (
    messageColIndex !== -1 &&
    !messageId &&
    sentForward.id
  ) {
    sheet
      .getRange(
        recordRowNumber,
        messageColIndex + 1
      )
      .setValue(sentForward.id);

    messageId = String(sentForward.id);
  }
}

    invalidateDataCaches(sheetName);

    saveActionLog(
      "ForwardLogs",
      refNumber,
      `Forwarded to ${forwardTo}`,
      body.updatedBy
    );

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: "Email forwarded successfully"
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
function sendAcknowledgementEmail(recipient, originalSubject,threadId) {
  const to = String(recipient || "").trim();

  if (!to) {
    throw new Error("Missing recipient email address");
  }

  const cleanSubject = String(
    originalSubject || "Communication"
  )
    .trim()
    .replace(/^((re|fw|fwd)\s*:\s*)+/i, "");

  const subject = `Re: ${cleanSubject}`;

  const plainText = [
  "Greetings!",
  "",
  "Please be informed that your email has been received and acknowledged by this Office.",
  "",
  "Thank you for communicating with the Office of Commissioner Desiderio R. Apag III.",
  "",
  "Respectfully,",
  "",
  "Desiderio R. Apag III, PCpE, D.Eng., ASEAN Eng.",
  "Commissioner"
].join("\n");

  const html = `
    <div style="
      margin:0;
      padding:1px;
      background:#f4f7fb;
      font-family:Arial,Helvetica,sans-serif;
      color:#1f2937;
    ">
      <div style="
        max-width:650px;
        margin:30px auto;
        background:#ffffff;
        border-radius:14px;
        overflow:hidden;
        border:1px solid #e5e7eb;
        box-shadow:0 8px 25px rgba(0,0,0,0.08);
      ">

        <!-- HEADER -->
        <div style="
          background:#ffffff;
          padding:28px 35px 20px;
        ">
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="border-collapse:collapse;"
          >
            <tr>
              <!-- CHED LOGO -->
              <td
                width="20%"
                align="left"
                style="vertical-align:middle;"
              >
                <img
                  src="https://chedcar.com/wp-content/uploads/2020/09/Commission_on_Higher_Education_CHEd.svg_.png"
                  alt="CHED Logo"
                  style="
                    width:90px;
                    height:auto;
                    display:block;
                  "
                >
              </td>

              <!-- OFFICE NAME -->
              <td
                width="60%"
                align="center"
                style="
                  vertical-align:middle;
                  font-family:'Times New Roman',serif;
                "
              >
                <div style="
                  font-size:19px;
                  font-weight:bold;
                  color:#000000;
                  white-space:nowrap;
                ">
                  COMMISSION ON HIGHER EDUCATION
                </div>

                <div style="
                  margin-top:1px;
                  font-size:16px;
                  font-weight:bold;
                  color:#000068;
                ">
                  Office of Commissioner Desiderio R. Apag III
                </div>
              </td>

              <!-- BAGONG PILIPINAS LOGO -->
              <td
                width="20%"
                align="right"
                style="vertical-align:middle;"
              >
                <img
                  src="https://stateofthenation.gov.ph/wp-content/uploads/2024/06/Bagong-Pilipinas-Logo.png"
                  alt="Bagong Pilipinas Logo"
                  style="
                    width:95px;
                    height:auto;
                    display:block;
                    margin-left:auto;
                  "
                >
              </td>
            </tr>
          </table>

          <!-- BLUE DIVIDER -->
          <div style="
            margin-top:28px;
            border-top:4px double #000068;
          "></div>

          <!-- LETTER TITLE -->
          <div style="
            margin-top:20px;
            text-align:center;
            font-family:Arial,Helvetica,sans-serif;
          ">
            <h2 style="
              margin:0;
              font-size:20px;
              color:#000068;
              font-weight:700;
            ">
              Acknowledgement
            </h2>
          </div>
        </div>

        <!-- LETTER BODY -->
        <div style="padding:28px 35px 40px;">
          <p style="
            margin-top:0;
            font-size:15px;
            color:#111827;
          ">
            Greetings!
          </p>

          <p style="
            margin-top:22px;
            font-size:15px;
            line-height:1.8;
            color:#374151;
          ">
            Please be informed that your email has been received and
            acknowledged by this Office.
          </p>

          <p style="
            margin-top:18px;
            font-size:15px;
            line-height:1.8;
            color:#374151;
          ">
            Thank you for communicating with the Office of Commissioner
            Desiderio R. Apag III.
          </p>

          <p style="
            margin-top:35px;
            margin-bottom:0;
            font-size:15px;
            color:#111827;
          ">
            Respectfully,
          </p>

          <p style="
            margin-top:28px;
            margin-bottom:0;
            font-size:18px;
            font-weight:800;
            color:#000068;
            font-family:'Times New Roman',serif;
          ">
            Desiderio R. Apag III, PCpE, D.Eng., ASEAN Eng.
          </p>

          <p style="
            margin-top:4px;
            margin-bottom:0;
            font-size:16px;
            font-weight:600;
            color:#374151;
            font-family:'Times New Roman',serif;
          ">
            Commissioner
          </p>
        </div>

        <!-- FOOTER -->
        <div style="
          background:#f9fafb;
          padding:16px 28px;
          text-align:center;
          border-top:1px solid #e5e7eb;
          font-size:12px;
          color:#6b7280;
        ">
          © ${new Date().getFullYear()} Communication Hub ©
          <br>
          Office of Commissioner Desiderio R. Apag III
        </div>
      </div>
    </div>
  `;

  // Open the exact Gmail thread saved in the Notifications sheet
const savedThreadId = String(threadId || "").trim();

if (!savedThreadId) {
  throw new Error(
    "This notification does not have a Gmail Thread ID."
  );
}

const thread = GmailApp.getThreadById(savedThreadId);

if (!thread) {
  throw new Error(
    "The original Gmail thread could not be opened."
  );
}

const threadMessages = thread.getMessages();

if (!threadMessages.length) {
  throw new Error(
    "The original Gmail thread does not contain any messages."
  );
}

const originalMessage =
  threadMessages[threadMessages.length - 1];

const originalMessageId =
  originalMessage.getHeader("Message-ID");

const senderEmailMatch =
  to.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

const senderEmail =
  senderEmailMatch ? senderEmailMatch[0] : to;

const rawEmailHeaders = [
  `To: ${senderEmail}`,
  `Subject: ${subject}`,
  "MIME-Version: 1.0",
  "Content-Type: text/html; charset=UTF-8"
];

if (originalMessageId) {
  rawEmailHeaders.push(
    `In-Reply-To: ${originalMessageId}`,
    `References: ${originalMessageId}`
  );
}

const rawEmail = [
  ...rawEmailHeaders,
  "",
  html
].join("\r\n");

const encodedEmail =
  Utilities
    .base64EncodeWebSafe(rawEmail)
    .replace(/=+$/, "");

Gmail.Users.Messages.send(
  {
    raw: encodedEmail,
    threadId: savedThreadId
  },
  "me"
);
}

function getSUCList() {
  try {
    const ss = getSS();
    const sheet = ss.getSheetByName("SUC");

    if (!sheet) {
      return {
        success: false,
        error: "SUC sheet not found",
      };
    }

    const values = sheet.getDataRange().getValues();

    if (values.length < 2) {
      return {
        success: true,
        data: [],
      };
    }

    values.shift(); // Remove header

    const data = values
      .filter(r => r[1])
      .map((r, index) => ({
        id: index + 1,
        school: r[1],
        email: r[2],
      }));

    return {
      success: true,
      data,
    };

  } catch (err) {
    return {
      success: false,
      error: err.toString(),
    };
  }
}

function testGmailAuth() {
  GmailApp.sendEmail("your_email@gmail.com", "Auth test", "This is a test.");
}

function clearCommTrackCache() {
  invalidateDataCaches(SHEET_NAME);
  invalidateDataCaches("Notifications");
}
function login(body) {
  const sheet = getSheet("Credentials");

  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: "Credentials sheet not found"
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const email = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "").trim();

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {

    const dbEmail = String(data[i][0]).trim().toLowerCase();
    const dbPassword = String(data[i][1]).trim();
    const dbName = String(data[i][2]).trim();

    if (dbEmail === email && dbPassword === password) {

      return ContentService
  .createTextOutput(JSON.stringify({
    success: true,
    id: i,
    email: dbEmail,
    name: dbName
  }))
  .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      message: "Invalid email or password."
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
function getOriginalCc(body) {
  try {
    const refNumber = String(body.refNumber || "").trim();

    const sheet = getSheet(SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "No data found"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const headers = data[0].map(String);

    const refCol = headers.indexOf("Ref number");
    const threadCol = headers.indexOf("Thread ID");
    const messageCol = headers.indexOf("Message ID");

    if (refCol === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Ref number column not found"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    for (let i = 1; i < data.length; i++) {

      if (String(data[i][refCol]).trim() !== refNumber) continue;

      let message = null;

      if (threadCol !== -1 && data[i][threadCol]) {
        const thread = GmailApp.getThreadById(data[i][threadCol]);
        const messages = thread.getMessages();
        message = messages[messages.length - 1];
      }
      else if (messageCol !== -1 && data[i][messageCol]) {
        message = GmailApp.getMessageById(data[i][messageCol]);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        cc: message ? message.getCc() : ""
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Reference not found"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
function getSucs() {

  const ss = getSS();

  const sheet = ss.getSheetByName("SUC");

  if (!sheet) {
    return [];
  }

  const values = sheet.getDataRange().getValues();

  const headers = values.shift().map(h => String(h).trim());
  const nameCol =headers.indexOf("SUC name");
  const emailCol =headers.indexOf("Email");
  if (
    nameCol === -1 || emailCol === -1
  ) {
    return [];
  }

  return values
    .filter(row => row[emailCol]).map(row => ({
      name:
        row[nameCol],
      email:
        row[emailCol]
    }));
}
function getOffices() {
  const sheet = getSheet("Offices");

  if (!sheet) {
    return [];
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return [];
  }

  const headers = values.shift().map(
    header => String(header).trim()
  );

  const nameCol = headers.indexOf("Office name");
  const emailCol = headers.indexOf("Email");

  if (nameCol === -1 || emailCol === -1) {
    return [];
  }

  return values
    .filter(row => row[emailCol])
    .map(row => ({
      name: String(row[nameCol] || "").trim(),
      email: String(row[emailCol] || "").trim()
    }));
}
function getTimeline(refNumber) {
  try {
    const ss = getSS();
    const cleanRef = String(refNumber || "").trim();
    const entries = [];
    const timelineSheet = ss.getSheetByName("Timeline");

    if (timelineSheet && timelineSheet.getLastRow() >= 2) {
      const timelineValues =
        timelineSheet.getDataRange().getValues();

      timelineValues.slice(1).forEach(row => {
        if (String(row[3] || "").trim() !== cleanRef) {
          return;
        }

        entries.push({
          timestamp: row[0],
          oldStatus: row[1],
          newStatus: row[2],
          refNumber: row[3],
          updatedBy: row[4] || "Unknown User"
        });
      });
    }

    [
      { sheetName: "ForwardLogs", event: "Forwarded" },
      { sheetName: "AssignedLogs", event: "Assigned" }
    ].forEach(logConfig => {
      const logSheet = ss.getSheetByName(logConfig.sheetName);

      if (!logSheet || logSheet.getLastRow() < 2) {
        return;
      }

      const values = logSheet.getDataRange().getValues();
      const headers = values[0].map(header =>
        String(header || "").trim()
      );
      const messageCol = headers.indexOf("Message");
      const timestampCol = headers.indexOf("Timestamp");

      if (messageCol === -1 || timestampCol === -1) {
        return;
      }

      const refPrefix = `[${cleanRef}]`;

      values.slice(1).forEach(row => {
        const storedMessage =
          String(row[messageCol] || "").trim();

        if (!storedMessage.startsWith(refPrefix)) {
          return;
        }

        const logContent =
          storedMessage.substring(refPrefix.length).trim();
        const separatorIndex = logContent.lastIndexOf(" || ");
        const description = separatorIndex === -1
          ? logContent
          : logContent.substring(0, separatorIndex).trim();
        const updatedBy = separatorIndex === -1
          ? "System"
          : logContent.substring(separatorIndex + 4).trim() ||
            "Unknown User";

        entries.push({
          timestamp: row[timestampCol],
          // newStatus keeps older deployed dashboards compatible.
          newStatus: description,
          timelineDescription: description,
          event: logConfig.event,
          refNumber: cleanRef,
          updatedBy: updatedBy
        });
      });
    });

    return entries
      .sort((first, second) =>
        new Date(first.timestamp).getTime() -
        new Date(second.timestamp).getTime()
      )
      .map(entry => ({
        ...entry,
        timestamp: Utilities.formatDate(
          new Date(entry.timestamp),
          Session.getScriptTimeZone(),
          "MMM dd, yyyy hh:mm a"
        )
      }));
  } catch(err) {
    Logger.log("Timeline load error: " + err);
    return [];
  }
}
function getRecords() {

  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = "commtrack_data_" + SHEET_NAME;
    const cached = cache.get(cacheKey);

    if (cached) {
      return ContentService
        .createTextOutput(cached)
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet =
      getSheet(SHEET_NAME);


    if (!sheet) {

      return ContentService
        .createTextOutput("[]")
        .setMimeType(
          ContentService.MimeType.JSON
        );

    }


    const values =
      sheet.getDataRange()
      .getValues();


    if (values.length < 2) {

      return ContentService
        .createTextOutput("[]")
        .setMimeType(
          ContentService.MimeType.JSON
        );

    }


    const headers =
      values.shift();


    const result =
      values.map(row => {

        let obj = {};


        headers.forEach(
          (header,index)=>{

            obj[header] =
              row[index];

          }
        );


        return obj;

      });


    const json = JSON.stringify(result);

    if (json.length < 90000) {
      cache.put(cacheKey, json, CACHE_SECONDS);
    }

    return ContentService
      .createTextOutput(json)
      .setMimeType(
        ContentService.MimeType.JSON
      );


  } catch(err) {


    return ContentService
      .createTextOutput(
        JSON.stringify({
          success:false,
          error:String(err)
        })
      )
      .setMimeType(
        ContentService.MimeType.JSON
      );


  }
}
function getDashboardData() {

  try {

    const cache =
      CacheService.getScriptCache();


    const cached =
      cache.get("dashboard_fast");


    if (cached) {

      return jsonResponse(
        JSON.parse(cached)
      );

    }


    const sheet =
      getSheet("Sheet1");


    if (!sheet) {

      return jsonResponse({
        success:false,
        error:"Sheet1 not found"
      });

    }


    const lastRow =
      sheet.getLastRow();


    if (lastRow < 2) {

      return jsonResponse({
        success:true,
        counts:{}
      });

    }


    const headers =
      sheet
      .getRange(
        1,
        1,
        1,
        sheet.getLastColumn()
      )
      .getValues()[0]
      .map(
        h => String(h).trim()
      );


    const remarkCol =
      headers.indexOf("Remarks");


    const dateCol =
      headers.indexOf("Date Received");


    if (
      remarkCol === -1 ||
      dateCol === -1
    ) {

      return jsonResponse({
        success:false,
        error:
        "Required columns missing"
      });

    }


    const data =
      sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        sheet.getLastColumn()
      )
      .getValues();


    const today =
      new Date()
      .toDateString();


    const counts = {

      today:0,

      pending:0,

      acknowledge:0,

      forAction:0,

      approved:0,

      disapproved:0,

      meetings:0,

      forInfo:0,

      invitations:0,

      memorandums:0,

      actioned:0

    };


    data.forEach(row => {


      const status =
        String(
          row[remarkCol] || ""
        )
        .trim()
        .toLowerCase();


      const rowDate =
        row[dateCol];


      if (
        rowDate &&
        new Date(rowDate)
        .toDateString()
        === today
      ) {

        counts.today++;

      }


      if(status==="pending")
        counts.pending++;


      if(status==="acknowledge")
        counts.acknowledge++;


      if(status==="for action")
        counts.forAction++;


      if(status==="approved")
        counts.approved++;


      if(status==="disapproved")
        counts.disapproved++;


      if(status==="meetings")
        counts.meetings++;


      if(status==="for info")
        counts.forInfo++;


      if(status==="invitations")
        counts.invitations++;


      if(status==="memorandums")
        counts.memorandums++;


      if(status==="actioned")
        counts.actioned++;


    });


    const output = {
      success:true,
      counts
    };


    cache.put(
      "dashboard_fast",
      JSON.stringify(output),
      300
    );


    return jsonResponse(output);


  } catch(err) {


    return jsonResponse({

      success:false,

      error:String(err)

    });


  }

}
function getNotifications() {
  const cache = CacheService.getScriptCache();
  const cacheKey = "commtrack_data_Notifications";
  const cached = cache.get(cacheKey);

  if (cached) {
    return ContentService
      .createTextOutput(cached)
      .setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = getSheet("Notifications");


  if (!sheet) {

    return jsonResponse([]);

  }


  const values =
    sheet.getDataRange()
    .getValues();


  if (values.length < 2) {

    return jsonResponse([]);

  }


  const headers =
    values.shift();


  const result =
    values
    .filter(row =>
      row.some(cell => cell !== "")
    )
    .map(row => {

      let obj = {};


      headers.forEach(
        (header,i)=>{

          obj[header] =
            row[i];

        }
      );


      return obj;

    });


  const json = JSON.stringify(result.reverse());

  if (json.length < 90000) {
    cache.put(cacheKey, json, CACHE_SECONDS);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);

}
function assignPersonnel(body) {
  try {
    const refNumber =
      String(body.refNumber || "").trim();

    const personnelEmail =
      String(body.personnelEmail || "").trim();

    const personnelName =
      String(body.personnelName || "Personnel").trim();

    const sheetName =
      body.sheet || SHEET_NAME;

    if (!refNumber || !personnelEmail) {
      return jsonResponse({
        success: false,
        error:
          "Missing reference number or personnel email"
      });
    }

    const sheet = getSheet(sheetName);

    if (!sheet) {
      return jsonResponse({
        success: false,
        error: "Sheet not found"
      });
    }

    const values =
      sheet.getDataRange().getValues();

    if (values.length < 2) {
      return jsonResponse({
        success: false,
        error: "No communication records found"
      });
    }

    const headers =
      values[0].map(header =>
        String(header).trim()
      );

    const refCol =
      headers.indexOf("Ref number");

    const subjectCol =
      headers.indexOf("Subject");

    const threadCol =
      headers.indexOf("Thread ID");

    const messageCol =
      headers.indexOf("Message ID");

    if (refCol === -1) {
      return jsonResponse({
        success: false,
        error: 'Column "Ref number" not found'
      });
    }

let record = null;
let recordRowNumber = -1;

for (let index = 1; index < values.length; index++) {
  const currentRef =
    String(values[index][refCol] || "").trim();

  if (currentRef === refNumber) {
    record = values[index];
    recordRowNumber = index + 1;
    break;
  }
}

    if (!record) {
      return jsonResponse({
        success: false,
        error: "Reference number not found"
      });
    }

    const communicationSubject =
      subjectCol !== -1
        ? String(
            record[subjectCol] || "Communication"
          ).trim()
        : "Communication";

    const threadId =
      threadCol !== -1
        ? String(record[threadCol] || "").trim()
        : "";

    const messageId =
      messageCol !== -1
        ? String(record[messageCol] || "").trim()
        : "";

    let originalMessage = null;

    if (threadId) {
      const thread =
        GmailApp.getThreadById(threadId);

      if (thread) {
        const messages =
          thread.getMessages();

        if (messages.length) {
  originalMessage =
    messages.find(message =>
      message.getAttachments().length > 0
    ) || messages[0];
}
      }
    } else if (messageId) {
      originalMessage =
        GmailApp.getMessageById(messageId);
    }

let attachments = [];

if (originalMessage) {
  attachments = originalMessage.getAttachments({
    includeInlineImages: false,
    includeAttachments: true
  });
}

const driveAttachments =
  getDriveAttachmentsFromRow(
    record,
    headers
  );

attachments = mergeUniqueAttachments(
  attachments,       // Gmail attachments
  driveAttachments   // Google Drive files
);

Logger.log(
  `Assignment ${refNumber}: ` +
  `${attachments.length} total attachment(s), ` +
  `${driveAttachments.length} from Drive`
);
Logger.log(
  `Assigning ${refNumber} with ` +
  `${attachments.length} attachment(s)`
);

    const emailSubject =
      `Communication Assigned: ${communicationSubject}`;

    const plainText = [
      `Dear ${personnelName},`,
      "",
      "Please be informed that the communication has been forwarded to you for your review and appropriate action. We kindly request that you look into this matter and take the necessary steps as needed and keep us updated on any actions taken or developments regarding this matter.",
      "",
      `Reference Number: ${refNumber}`,
      `Subject: ${communicationSubject}`,
      "",
      "Kindly, keep us updated on any actions taken or developments regarding this matter.",
      "",
      "Daghang salamat!"
    ].join("\n");

    const safeName =
      escapeAssignmentHtml(personnelName);

    const safeRefNumber =
      escapeAssignmentHtml(refNumber);

    const safeSubject =
      escapeAssignmentHtml(
        communicationSubject
      );

    const htmlBody = `
      <div style="
        margin:0;
        padding:30px 15px;
        background:#f4f7fb;
        font-family:Arial,Helvetica,sans-serif;
        color:#1f2937;
      ">
        <div style="
          max-width:650px;
          margin:auto;
          background:#ffffff;
          border:1px solid #e5e7eb;
          border-radius:14px;
          overflow:hidden;
        ">

          <div style="
            padding:24px 30px;
            background:#000068;
            color:#ffffff;
          ">
            <div style="
              font-size:12px;
              text-transform:uppercase;
              letter-spacing:1.5px;
              opacity:0.85;
            ">
              Communication Hub
            </div>

            <h2 style="
              margin:8px 0 0;
              font-size:22px;
            ">
              New Communication Assignment
            </h2>
          </div>

          <div style="padding:30px;">

            <p>
              Dear <strong>${safeName}</strong>,
            </p>

            <p style="line-height:1.8;">
              Please be informed that the communication
              has been forwarded to you for your review
              and appropriate action. We kindly request
              that you look into this matter and take the
              necessary steps as needed and keep us
              updated on any actions taken or developments
              regarding this matter.
            </p>

            <div style="
              margin:24px 0;
              padding:18px;
              background:#f8fafc;
              border:1px solid #e5e7eb;
              border-left:5px solid #000068;
              border-radius:8px;
            ">
              <p style="margin:0 0 10px;">
                <strong>Reference Number:</strong>
                ${safeRefNumber}
              </p>

              <p style="margin:0;">
                <strong>Subject:</strong>
                ${safeSubject}
              </p>
            </div>

            <p style="line-height:1.8;">
              Kindly, keep us updated on any actions taken
              or developments regarding this matter.
            </p>

            <p style="margin-top:28px;">
              <strong>Daghang salamat!</strong>
            </p>

          </div>
        </div>
      </div>
    `;
const mixedBoundary =
  "assign_mixed_" +
  Utilities.getUuid().replace(/-/g, "");

const alternativeBoundary =
  "assign_alt_" +
  Utilities.getUuid().replace(/-/g, "");
const originalMessageIdHeader = originalMessage
  ? String(
      originalMessage.getHeader("Message-ID") || ""
    ).trim()
  : "";

/*
 * Gmail requires the subject to match for reliable threading.
 * The HTML body will still identify this as an assignment.
 */
const assignmentThreadSubject = originalMessage
  ? String(
      originalMessage.getSubject() ||
      communicationSubject
    ).trim()
  : communicationSubject;
const encodedSubject =
  "=?UTF-8?B?" +
  Utilities.base64Encode(
    Utilities.newBlob(
  assignmentThreadSubject,
  "text/plain",
  "subject"
)
      .getBytes()
  ) +
  "?=";

const messageHeaders = [
  `To: ${personnelEmail}`,
  `Subject: ${encodedSubject}`,
  "MIME-Version: 1.0",
  `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`
];

if (originalMessageIdHeader) {
  messageHeaders.push(
    `In-Reply-To: ${originalMessageIdHeader}`,
    `References: ${originalMessageIdHeader}`
  );
}

const mimeParts = [
  ...messageHeaders,
  "",

  `--${mixedBoundary}`,
  `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
  "",

  // Plain-text email
  `--${alternativeBoundary}`,
  'Content-Type: text/plain; charset="UTF-8"',
  "Content-Transfer-Encoding: base64",
  "",

  Utilities.base64Encode(
    Utilities
      .newBlob(
        plainText,
        "text/plain"
      )
      .getBytes()
  ),

  // HTML email
  `--${alternativeBoundary}`,
  'Content-Type: text/html; charset="UTF-8"',
  "Content-Transfer-Encoding: base64",
  "",

  Utilities.base64Encode(
    Utilities
      .newBlob(
        htmlBody,
        "text/html"
      )
      .getBytes()
  ),

  `--${alternativeBoundary}--`
];

// Add the original attachments
attachments.forEach(file => {
  const fileName =
    String(
      file.getName() || "attachment"
    ).replace(/[\r\n"]/g, "_");

  const contentType =
    file.getContentType() ||
    "application/octet-stream";

  mimeParts.push(
    `--${mixedBoundary}`,
    `Content-Type: ${contentType}; name="${fileName}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${fileName}"`,
    "",
    Utilities.base64Encode(
      file.getBytes()
    )
  );
});

mimeParts.push(
  `--${mixedBoundary}--`,
  ""
);

const raw =
  Utilities
    .base64EncodeWebSafe(
      mimeParts.join("\r\n")
    )
    .replace(/=+$/, "");

const assignmentPayload = {
  raw: raw
};

if (threadId) {
  assignmentPayload.threadId = threadId;
}

const sentAssignment =
  Gmail.Users.Messages.send(
    assignmentPayload,
    "me"
  );

/*
 * For Drive-only records, save the newly created Gmail thread.
 * Later forwards and assignments will reuse it.
 */
if (
  recordRowNumber !== -1 &&
  sentAssignment
) {
  if (
    threadCol !== -1 &&
    !threadId &&
    sentAssignment.threadId
  ) {
    sheet
      .getRange(
        recordRowNumber,
        threadCol + 1
      )
      .setValue(sentAssignment.threadId);
  }

  if (
    messageCol !== -1 &&
    !messageId &&
    sentAssignment.id
  ) {
    sheet
      .getRange(
        recordRowNumber,
        messageCol + 1
      )
      .setValue(sentAssignment.id);
  }
}

    invalidateDataCaches(sheetName);

    saveActionLog(
      "AssignedLogs",
      refNumber,
      `Assigned to ${personnelName || personnelEmail}`,
      body.updatedBy
    );

    return jsonResponse({
      success: true,
      message:
        `Assignment email sent to ${personnelName}`
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      error: String(error)
    });
  }
}

function escapeAssignmentHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function clearAllCache() {

  CacheService
    .getScriptCache()
    .removeAll([
      "dashboard_fast",
      "commtrack_data_Sheet1",
      "commtrack_data_Notifications"
    ]);

}
