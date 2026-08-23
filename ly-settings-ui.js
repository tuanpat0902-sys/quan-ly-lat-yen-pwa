/* Lát Yên — Settings UI V1
   Extracted from Legacy index.html. Migration/auth/sync functions remain in Legacy core. */
(()=>{
  'use strict';
  if(window.__lySettingsUIModule)return;
  window.__lySettingsUIModule={version:'2026.08.23.1'};

  function renderSettings(){
    const brand=loadAppBrand();
    const pending=Number(v191PendingCount?.()||0);
  
    E.settings.innerHTML=`
      <div class="v260-account-bar">
        <div>
          <b>Tài khoản quản trị</b>
          <div class="muted">
            ${esc(v260AccountEmail()||'admin@latyen.vn')}
          </div>
        </div>
  
        <button
          class="secondary sm"
          onclick="v260LogoutAndWipe()"
        >Đăng xuất</button>
      </div>
  
      <div class="card">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap">
          <div>
            <h2 style="margin:0 0 6px">Supabase Cloud</h2>
  
            <div class="muted">
              <b>Cloud là nguồn dữ liệu nghiệp vụ duy nhất.</b>
              Phiếu mới trong phiên chỉ được giữ tạm trong RAM cho đến khi Cloud xác nhận; dữ liệu local từ phiên bản cũ vẫn không được đọc.
            </div>
          </div>
  
          <span class="badge ${navigator.onLine?'okb':'warnb'}">
            ${navigator.onLine?'Online':'Offline'}
          </span>
        </div>
  
        <div
          id="v269SyncState"
          style="margin-top:14px;padding:12px;border:1px solid var(--border,#d7dce2);border-radius:8px"
        ></div>
  
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          <button
            class="primary"
            onclick="loadCloud()"
          >Tải lại từ Cloud</button>
  
          <button
            class="secondary"
            onclick="v269ReconnectRealtime()"
          >Kết nối lại Realtime</button>
        </div>
  
        ${
          pending
            ?`<div style="margin-top:10px;color:#b45309;font-size:12px">${esc(v270PendingText())}</div>`
            :''
        }
      </div>
  
      <div class="section-gap"></div>
  
      <div class="card">
        <h2>Dữ liệu trên thiết bị</h2>
  
        <p class="muted">
          V271 không lưu database nghiệp vụ vào localStorage và không khôi phục dữ liệu
          nghiệp vụ từ IndexedDB. Trình duyệt/PWA vẫn có thể dùng bộ nhớ kỹ thuật cho
          Service Worker, file giao diện và phiên đăng nhập Supabase; các dữ liệu này
          không được dùng để tạo Kho, Nguyên liệu, Công thức, Nhập/Xuất, Kiểm kê hay Bán hàng.
        </p>
  
        <button
          class="secondary sm"
          onclick="v271PurgeLegacyBusinessLocal().then(()=>loadCloud())"
        >Xóa dữ liệu local cũ & tải lại Cloud</button>
      </div>
  
      <div class="section-gap"></div>
  
      <div class="card">
        <h2>Dữ liệu & an toàn</h2>
  
        <div class="grid2">
          <div>
            <h3>Backup ngoài Cloud</h3>
            <p class="muted">
              Chỉ dùng khi cần một bản sao thủ công bên ngoài Supabase.
            </p>
  
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button
                class="secondary sm"
                onclick="exportBackup()"
              >Xuất file backup</button>
  
              <button
                class="secondary sm"
                onclick="selectBackupImport()"
              >Khôi phục từ file</button>
            </div>
  
            <input
              id="backupImportInput"
              type="file"
              accept="application/json,.json"
              style="display:none"
              onchange="importBackupFile(this)"
            >
          </div>
  
          <div>
            <h3>Làm mới Cloud</h3>
            <p class="muted">
              Xóa toàn bộ dữ liệu nghiệp vụ Supabase; tài khoản admin vẫn giữ.
            </p>
  
            <button
              class="danger sm"
              onclick="v264ResetCloudClean()"
            >Xóa sạch dữ liệu Cloud</button>
          </div>
        </div>
      </div>
  
      <div class="section-gap"></div>
  
      <div class="card brand-settings-card">
        <div class="brand-settings-head">
          <div>
            <h2>Nhận diện phần mềm</h2>
            <div class="muted">
              Tên và logo giao diện; không phải dữ liệu nghiệp vụ.
            </div>
          </div>
  
          ${
            brand.logo
              ?`<img class="brand-preview-logo" src="${brand.logo}" alt="Logo">`
              :''
          }
        </div>
  
        <div class="brand-settings-grid">
          <div>
            <label>Tên phần mềm</label>
  
            <div class="brand-name-actions">
              <input
                id="brandNameInput"
                maxlength="80"
                value="${esc(brand.name)}"
              >
  
              <button
                class="primary"
                onclick="saveAppName()"
              >Lưu tên</button>
            </div>
          </div>
  
          <div>
            <label>Logo phần mềm</label>
  
            <input
              id="brandLogoInput"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              style="display:none"
              onchange="handleAppLogo(this)"
            >
  
            <div class="brand-logo-actions">
              <button
                class="secondary"
                onclick="selectAppLogo()"
              >
                ${brand.logo?'Thay logo':'Thêm logo'}
              </button>
  
              ${
                brand.logo
                  ?`<button class="danger" onclick="removeAppLogo()">Xóa logo</button>`
                  :''
              }
            </div>
          </div>
        </div>
      </div>
  
      <div class="section-gap"></div>
  
      <div class="card">
        <h2>Thiết bị khác</h2>
        <p class="muted">
          Chỉ cần đăng nhập cùng tài khoản <b>admin@latyen.vn</b>.
          Mỗi thiết bị tải dữ liệu trực tiếp từ Supabase Cloud.
        </p>
      </div>
    `;
  
    setTimeout(v269RenderSyncStatus,0);
  }
  
  async

  window.__lySettingsUIModule.renderSettings=renderSettings;
})();
