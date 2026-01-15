; FileSmilesScanner Inno Setup Script - Improved Version
; Requires Inno Setup 6.x (https://jrsoftware.org/isinfo.php)

#define MyAppName "FileSmilesScanner"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Priority Software"
#define MyAppURL "https://priority-software.com"
#define MyAppExeName "FileSmilesScanner.exe"
#define MyServiceName "FileSmilesScanner"
#define MyServicePort "25319"

[Setup]
AppId={{8E7B3A2F-1C4D-4E5F-9A6B-7C8D9E0F1A2B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=output
OutputBaseFilename=FileSmilesScanner-Setup-{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}
DisableProgramGroupPage=yes
CloseApplications=force
RestartApplications=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
WelcomeLabel1=Welcome to FileSmilesScanner Setup
WelcomeLabel2=This will install FileSmilesScanner as a Windows Service on your computer.%n%nFileSmilesScanner enables document scanning from web applications by providing a local REST API on port {#MyServicePort}.%n%n[Administrator privileges required]%nThis installer needs admin rights to register and configure the Windows Service for automatic startup.%n%nClick Next to continue.

[CustomMessages]
PreCheckTitle=Pre-Installation Checks
PreCheckDesc=Verifying system requirements...
PostInstallTitle=Installation Complete
PostInstallDesc=Verifying service status...
StatusChecking=Checking...
StatusPass=PASS
StatusFail=FAIL
StatusWarn=WARN
StatusInfo=INFO

[Files]
Source: "..\publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "ServiceControlPanel.ps1"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName} Web Interface"; Filename: "http://localhost:{#MyServicePort}/swagger"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{group}\{#MyAppName} Control Panel"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\ServiceControlPanel.ps1"""; IconFilename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"

[Run]
Filename: "http://localhost:{#MyServicePort}/swagger"; Description: "Open Web Interface"; Flags: postinstall shellexec skipifsilent unchecked
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\ServiceControlPanel.ps1"""; Description: "Open Control Panel"; Flags: postinstall nowait skipifsilent unchecked

[UninstallRun]
Filename: "sc.exe"; Parameters: "stop {#MyServiceName}"; Flags: runhidden waituntilterminated; RunOnceId: "StopService"

[Code]
var
  PreCheckPage: TWizardPage;
  PreCheckMemo: TNewMemo;
  PostInstallPage: TWizardPage;
  PostInstallMemo: TNewMemo;
  PortAvailable: Boolean;
  PreviousInstallFound: Boolean;
  ServiceCreatedOK: Boolean;
  ServiceStartedOK: Boolean;
  ApiRespondingOK: Boolean;

// ============================================
// Helper Functions
// ============================================

function ServiceExists(ServiceName: String): Boolean;
var
  ResultCode: Integer;
begin
  Exec('sc.exe', 'query ' + ServiceName, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := (ResultCode = 0);
end;

function ServiceIsRunning(ServiceName: String): Boolean;
var
  ResultCode: Integer;
  TempFile, Output: AnsiString;
begin
  Result := False;
  TempFile := ExpandConstant('{tmp}\sc_query.txt');

  if Exec('cmd.exe', '/c sc.exe query ' + ServiceName + ' > "' + TempFile + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if LoadStringFromFile(TempFile, Output) then
    begin
      Result := (Pos('RUNNING', Output) > 0);
    end;
  end;
end;

function CheckPortAvailable(Port: String): Boolean;
var
  ResultCode: Integer;
  TempFile, Output: AnsiString;
begin
  Result := True;
  TempFile := ExpandConstant('{tmp}\netstat_check.txt');

  if Exec('cmd.exe', '/c netstat -an | find ":' + Port + '" > "' + TempFile + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if LoadStringFromFile(TempFile, Output) then
    begin
      // If find returns content, port is in use
      Result := (Length(Trim(Output)) = 0);
    end;
  end;
end;

function StopServiceWithTimeout(ServiceName: String; TimeoutSeconds: Integer): Boolean;
var
  ResultCode, WaitCount: Integer;
begin
  Exec('sc.exe', 'stop ' + ServiceName, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

  WaitCount := 0;
  while ServiceIsRunning(ServiceName) and (WaitCount < TimeoutSeconds) do
  begin
    Sleep(1000);
    WaitCount := WaitCount + 1;
  end;

  Result := not ServiceIsRunning(ServiceName);
end;

function StartServiceWithTimeout(ServiceName: String; TimeoutSeconds: Integer): Boolean;
var
  ResultCode, WaitCount: Integer;
begin
  Exec('sc.exe', 'start ' + ServiceName, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

  WaitCount := 0;
  while (not ServiceIsRunning(ServiceName)) and (WaitCount < TimeoutSeconds) do
  begin
    Sleep(1000);
    WaitCount := WaitCount + 1;
  end;

  Result := ServiceIsRunning(ServiceName);
end;

function CreateWindowsService(): Boolean;
var
  ResultCode: Integer;
  ExePath: String;
begin
  ExePath := ExpandConstant('{app}\{#MyAppExeName}');

  // Create service
  Result := Exec('sc.exe', 'create {#MyServiceName} binPath= "' + ExePath + '" start= auto DisplayName= "{#MyAppName} - Document Scanning Service"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

  if not Result or (ResultCode <> 0) then
  begin
    Result := False;
    Exit;
  end;

  // Set description
  Exec('sc.exe', 'description {#MyServiceName} "Provides TWAIN/WIA scanner access via REST API for web applications"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

  // Configure failure recovery (restart on failure)
  Exec('sc.exe', 'failure {#MyServiceName} reset= 86400 actions= restart/5000/restart/10000/restart/30000', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

  Result := True;
end;

function VerifyApiResponse(): Boolean;
var
  WinHttpReq: Variant;
begin
  Result := False;
  try
    WinHttpReq := CreateOleObject('WinHttp.WinHttpRequest.5.1');
    WinHttpReq.Open('GET', 'http://localhost:{#MyServicePort}/api/VintasoftTwainApi/Status', False);
    WinHttpReq.SetTimeouts(3000, 3000, 3000, 3000);
    WinHttpReq.Send();

    if WinHttpReq.Status = 200 then
    begin
      Result := True;
    end;
  except
    Result := False;
  end;
end;

// ============================================
// Pre-Installation Check Page
// ============================================

procedure UpdatePreCheckDisplay();
var
  StatusText: String;
begin
  StatusText := 'Checking system requirements...' + #13#10 + #13#10;

  // Port Check
  if PortAvailable then
    StatusText := StatusText + '[PASS] Port {#MyServicePort}: Available' + #13#10
  else
    StatusText := StatusText + '[WARN] Port {#MyServicePort}: In use by another application' + #13#10;

  // Previous Install Check
  if PreviousInstallFound then
    StatusText := StatusText + '[INFO] Previous installation detected (will be upgraded)' + #13#10
  else
    StatusText := StatusText + '[PASS] No previous installation found' + #13#10;

  // .NET Runtime (informational - we're self-contained)
  StatusText := StatusText + '[INFO] .NET Runtime: Bundled with installer' + #13#10;

  StatusText := StatusText + #13#10;

  if PortAvailable then
    StatusText := StatusText + 'All checks passed. Click Next to continue installation.'
  else
    StatusText := StatusText + 'WARNING: Port {#MyServicePort} is in use.' + #13#10 + 'The service may fail to start. Consider closing the application using this port.';

  PreCheckMemo.Text := StatusText;
end;

procedure PreCheckPageActivate(Sender: TWizardPage);
begin
  // Run checks
  PortAvailable := CheckPortAvailable('{#MyServicePort}');
  PreviousInstallFound := ServiceExists('{#MyServiceName}');

  UpdatePreCheckDisplay();
end;

// ============================================
// Post-Installation Verification Page
// ============================================

procedure UpdatePostInstallDisplay();
var
  StatusText: String;
begin
  StatusText := 'Installation Results:' + #13#10 + #13#10;

  if ServiceCreatedOK then
    StatusText := StatusText + '[PASS] Windows Service created successfully' + #13#10
  else
    StatusText := StatusText + '[FAIL] Windows Service creation failed' + #13#10;

  if ServiceStartedOK then
    StatusText := StatusText + '[PASS] Service started successfully' + #13#10
  else
    StatusText := StatusText + '[FAIL] Service failed to start' + #13#10;

  if ApiRespondingOK then
    StatusText := StatusText + '[PASS] API responding on port {#MyServicePort}' + #13#10
  else
    StatusText := StatusText + '[FAIL] API not responding' + #13#10;

  StatusText := StatusText + #13#10;

  if ServiceCreatedOK and ServiceStartedOK and ApiRespondingOK then
  begin
    StatusText := StatusText + 'FileSmilesScanner is ready to use!' + #13#10;
    StatusText := StatusText + 'The service will start automatically with Windows.' + #13#10 + #13#10;
    StatusText := StatusText + 'You can manage the service using the Control Panel shortcut in the Start Menu.';
  end
  else
  begin
    StatusText := StatusText + 'Installation completed with issues.' + #13#10 + #13#10;
    StatusText := StatusText + 'Troubleshooting tips:' + #13#10;
    StatusText := StatusText + '  - Check Windows Event Viewer (Application log)' + #13#10;
    StatusText := StatusText + '  - Ensure no other app uses port {#MyServicePort}' + #13#10;
    StatusText := StatusText + '  - Try starting service from the Control Panel' + #13#10;
  end;

  PostInstallMemo.Text := StatusText;
end;

procedure PostInstallPageActivate(Sender: TWizardPage);
var
  RetryCount: Integer;
begin
  PostInstallMemo.Text := 'Verifying installation...' + #13#10 + #13#10 + 'Please wait...';

  // Check service created
  ServiceCreatedOK := ServiceExists('{#MyServiceName}');

  // Check service running
  ServiceStartedOK := ServiceIsRunning('{#MyServiceName}');

  // Check API responding (with retries)
  ApiRespondingOK := False;
  RetryCount := 0;
  while (not ApiRespondingOK) and (RetryCount < 5) do
  begin
    Sleep(1000);
    ApiRespondingOK := VerifyApiResponse();
    RetryCount := RetryCount + 1;
  end;

  UpdatePostInstallDisplay();
end;

// ============================================
// Wizard Page Setup
// ============================================

procedure InitializeWizard();
begin
  // Create Pre-Check Page (after Welcome, before Select Dir)
  PreCheckPage := CreateCustomPage(wpWelcome,
    ExpandConstant('{cm:PreCheckTitle}'),
    ExpandConstant('{cm:PreCheckDesc}'));

  PreCheckMemo := TNewMemo.Create(PreCheckPage);
  PreCheckMemo.Parent := PreCheckPage.Surface;
  PreCheckMemo.Left := 0;
  PreCheckMemo.Top := 0;
  PreCheckMemo.Width := PreCheckPage.SurfaceWidth;
  PreCheckMemo.Height := PreCheckPage.SurfaceHeight;
  PreCheckMemo.ScrollBars := ssVertical;
  PreCheckMemo.ReadOnly := True;
  PreCheckMemo.Font.Name := 'Consolas';
  PreCheckMemo.Font.Size := 10;
  PreCheckMemo.Text := 'Checking...';

  PreCheckPage.OnActivate := @PreCheckPageActivate;

  // Create Post-Install Verification Page (after Installing, before Finish)
  PostInstallPage := CreateCustomPage(wpInstalling,
    ExpandConstant('{cm:PostInstallTitle}'),
    ExpandConstant('{cm:PostInstallDesc}'));

  PostInstallMemo := TNewMemo.Create(PostInstallPage);
  PostInstallMemo.Parent := PostInstallPage.Surface;
  PostInstallMemo.Left := 0;
  PostInstallMemo.Top := 0;
  PostInstallMemo.Width := PostInstallPage.SurfaceWidth;
  PostInstallMemo.Height := PostInstallPage.SurfaceHeight;
  PostInstallMemo.ScrollBars := ssVertical;
  PostInstallMemo.ReadOnly := True;
  PostInstallMemo.Font.Name := 'Consolas';
  PostInstallMemo.Font.Size := 10;
  PostInstallMemo.Text := 'Waiting for installation to complete...';

  PostInstallPage.OnActivate := @PostInstallPageActivate;
end;

// ============================================
// Installation Steps
// ============================================

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
begin
  Result := '';

  // Stop existing service if running
  if ServiceExists('{#MyServiceName}') then
  begin
    if not StopServiceWithTimeout('{#MyServiceName}', 10) then
    begin
      // Force kill as fallback
      Exec('taskkill.exe', '/F /IM {#MyAppExeName}', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Sleep(2000);
    end;

    // Delete existing service
    Exec('sc.exe', 'delete {#MyServiceName}', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Sleep(1000);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // Create and start the Windows Service
    ServiceCreatedOK := CreateWindowsService();

    if ServiceCreatedOK then
    begin
      ServiceStartedOK := StartServiceWithTimeout('{#MyServiceName}', 15);
    end;
  end;
end;

// ============================================
// Uninstallation
// ============================================

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    // Stop service gracefully
    if ServiceIsRunning('{#MyServiceName}') then
    begin
      if not StopServiceWithTimeout('{#MyServiceName}', 10) then
      begin
        // Force kill as fallback
        Exec('taskkill.exe', '/F /IM {#MyAppExeName}', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
        Sleep(2000);
      end;
    end;

    // Delete service
    Exec('sc.exe', 'delete {#MyServiceName}', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Sleep(1000);
  end;
end;
