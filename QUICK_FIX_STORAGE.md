# 🔧 빠른 해결: 프로필 사진 업로드 오류

## 에러 메시지
```
이미지 업로드에 실패했습니다: bucket not found
```

## 원인
Supabase Storage에 `avatars` 버킷이 생성되지 않았습니다.

---

## 📱 해결 방법 (5분)

### 1단계: Supabase Storage 접속
1. **새 탭 열기**: https://supabase.com
2. **로그인** 후 **JG Finance** 프로젝트 클릭
3. 왼쪽 메뉴에서 **Storage** 클릭

### 2단계: avatars 버킷 생성
1. **New bucket** 버튼 클릭 (우측 상단)
2. 다음 정보 입력:
   ```
   Name: avatars
   Public bucket: ✅ (체크 필수!)
   ```
3. **Create bucket** 버튼 클릭

### 3단계: Storage 정책 설정
1. 생성된 `avatars` 버킷 클릭
2. 상단 **Policies** 탭 클릭
3. **New policy** 클릭
4. **For full customization** 선택
5. 아래 SQL을 **하나씩** 실행:

#### 정책 1: 업로드 허용
```sql
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');
```

#### 정책 2: 조회 허용
```sql
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

#### 정책 3: 업데이트 허용
```sql
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');
```

#### 정책 4: 삭제 허용
```sql
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
```

### 4단계: 확인
1. Supabase Dashboard → Storage
2. `avatars` 버킷 존재 확인
3. 버킷 옆에 **🌐 Public** 표시 확인
4. Policies 탭에서 4개의 정책 모두 **Enabled** 확인

### 5단계: 앱에서 테스트
1. 앱으로 돌아가서 **새로고침** (Cmd+R)
2. 설정 → 가족 구성원 → 수정
3. 이미지 업로드 다시 시도

---

## ✅ 성공 확인

**이미지 업로드가 성공하면:**
- 업로드 중 "업로드 중..." 표시
- 저장 완료 후 프로필 사진 변경됨
- 새로고침해도 사진 유지됨

---

## 🎬 스크린샷 가이드

### Supabase Storage 화면
```
┌─────────────────────────────────────┐
│ Storage                             │
├─────────────────────────────────────┤
│ [New bucket]                        │
│                                     │
│ 📁 avatars 🌐                       │  ← 이렇게 보여야 함
│                                     │
└─────────────────────────────────────┘
```

### New bucket 모달
```
┌─────────────────────────────────────┐
│ Create a new bucket                 │
├─────────────────────────────────────┤
│ Name: avatars                       │
│                                     │
│ ☑ Public bucket                     │  ← 반드시 체크!
│ ☐ Restrict file upload size        │
│                                     │
│ [Cancel]  [Create bucket]           │
└─────────────────────────────────────┘
```

---

## 💡 팁

### Public bucket이 중요한 이유
- ✅ Public: 모든 사용자가 이미지를 볼 수 있음 (프로필 사진에 필수!)
- ⛔ Private: 로그인한 사용자만 볼 수 있어 다른 사람의 프로필 사진이 안 보임

### 정책이 중요한 이유
- 정책 없으면: 업로드는 성공해도 이미지를 볼 수 없음
- 4개 정책 모두 필요: 업로드, 조회, 수정, 삭제 각각 별도 정책

---

## 🐛 문제 해결

### Q: "Policy violation" 에러 발생
**A:** 3단계의 SQL 정책을 모두 실행했는지 확인하세요.

### Q: 이미지가 업로드되지만 보이지 않음
**A:**
1. Storage → avatars 버킷 → Settings
2. "Public bucket" 활성화 확인
3. Policies 탭에서 "Anyone can view avatars" 정책 확인

### Q: 여전히 "bucket not found" 에러
**A:**
1. Supabase Dashboard → Storage
2. 버킷 이름이 정확히 `avatars`인지 확인 (철자 주의!)
3. 앱 새로고침 (Shift + Cmd + R)

---

## 📞 추가 도움

위 단계를 모두 완료했는데도 문제가 해결되지 않으면:
1. Supabase Dashboard → Storage → avatars 클릭
2. 스크린샷 찍어서 공유
3. 브라우저 콘솔(F12) → Console 탭 → 에러 메시지 확인

---

## 완료 체크리스트

- [ ] Supabase Storage에 `avatars` 버킷 생성
- [ ] Public bucket으로 설정
- [ ] 4개의 Storage 정책 모두 실행
- [ ] Policies 탭에서 정책이 모두 Enabled 상태
- [ ] 앱 새로고침
- [ ] 이미지 업로드 테스트 성공
