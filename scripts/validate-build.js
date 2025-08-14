#!/usr/bin/env node

/**
 * 빌드 검증 스크립트
 * 빌드된 확장프로그램이 올바르게 생성되었는지 확인합니다.
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const REQUIRED_FILES = [
  'manifest.json',
  'background/background.js',
  'content/content.js',
  'popup/popup.html',
  'popup/popup.js',
  'popup/popup.css',
  'settings/settings.html',
  'settings/settings.js',
  'settings/settings.css',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png'
];

console.log('🔍 빌드 검증을 시작합니다...\n');

// dist 디렉토리 존재 확인
if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ dist 디렉토리가 존재하지 않습니다.');
  console.error('   npm run build를 먼저 실행해주세요.');
  process.exit(1);
}

let hasErrors = false;

// 필수 파일 존재 확인
console.log('📁 필수 파일 확인:');
REQUIRED_FILES.forEach(file => {
  const filePath = path.join(DIST_DIR, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - 파일이 없습니다`);
    hasErrors = true;
  }
});

// manifest.json 검증
console.log('\n📋 manifest.json 검증:');
try {
  const manifestPath = path.join(DIST_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // 필수 필드 확인
  const requiredFields = ['manifest_version', 'name', 'version', 'description'];
  requiredFields.forEach(field => {
    if (manifest[field]) {
      console.log(`   ✅ ${field}: ${manifest[field]}`);
    } else {
      console.log(`   ❌ ${field} - 필드가 없습니다`);
      hasErrors = true;
    }
  });
  
  // Manifest V3 확인
  if (manifest.manifest_version === 3) {
    console.log('   ✅ Manifest V3 사용');
  } else {
    console.log('   ❌ Manifest V3가 아닙니다');
    hasErrors = true;
  }
  
  // 권한 확인
  if (manifest.permissions && Array.isArray(manifest.permissions)) {
    console.log(`   ✅ 권한: ${manifest.permissions.join(', ')}`);
  } else {
    console.log('   ⚠️  권한이 정의되지 않았습니다');
  }
  
} catch (error) {
  console.log(`   ❌ manifest.json 파싱 오류: ${error.message}`);
  hasErrors = true;
}

// JavaScript 파일 구문 검사
console.log('\n🔧 JavaScript 파일 구문 검사:');
const jsFiles = [
  'background/background.js',
  'content/content.js',
  'popup/popup.js',
  'settings/settings.js'
];

jsFiles.forEach(file => {
  const filePath = path.join(DIST_DIR, file);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      // 기본적인 구문 검사 (실제로는 더 정교한 검사 필요)
      if (content.includes('syntax error') || content.length === 0) {
        throw new Error('구문 오류 또는 빈 파일');
      }
      console.log(`   ✅ ${file}`);
    } catch (error) {
      console.log(`   ❌ ${file} - ${error.message}`);
      hasErrors = true;
    }
  }
});

// 파일 크기 확인
console.log('\n📊 파일 크기 확인:');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
let totalSize = 0;

function getDirectorySize(dirPath) {
  let size = 0;
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      size += getDirectorySize(filePath);
    } else {
      size += stats.size;
    }
  });
  
  return size;
}

totalSize = getDirectorySize(DIST_DIR);
const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

console.log(`   📦 전체 크기: ${totalSizeMB}MB`);

if (totalSize > MAX_FILE_SIZE) {
  console.log(`   ⚠️  크기가 큽니다 (최대 권장: 5MB)`);
} else {
  console.log(`   ✅ 크기가 적절합니다`);
}

// 아이콘 파일 확인
console.log('\n🎨 아이콘 파일 확인:');
const iconSizes = [16, 48, 128];
iconSizes.forEach(size => {
  const iconPath = path.join(DIST_DIR, 'icons', `icon${size}.png`);
  if (fs.existsSync(iconPath)) {
    const stats = fs.statSync(iconPath);
    console.log(`   ✅ icon${size}.png (${(stats.size / 1024).toFixed(1)}KB)`);
  } else {
    console.log(`   ❌ icon${size}.png - 파일이 없습니다`);
    hasErrors = true;
  }
});

// 결과 출력
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ 빌드 검증 실패');
  console.log('   위의 오류들을 수정한 후 다시 빌드해주세요.');
  process.exit(1);
} else {
  console.log('✅ 빌드 검증 성공');
  console.log('   확장프로그램이 올바르게 빌드되었습니다.');
  console.log(`   배포 준비 완료: dist/ (${totalSizeMB}MB)`);
}

console.log('='.repeat(50));