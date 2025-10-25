# 📸 프로필 사진 업로드 기능 설정 가이드

## 1단계: Supabase Storage 버킷 생성

### 1. Storage 섹션 접속
1. https://supabase.com 접속 후 JG Finance 프로젝트 선택
2. 왼쪽 메뉴에서 **Storage** 클릭
3. **New bucket** 버튼 클릭

### 2. 버킷 설정
- **Name:** `avatars`
- **Public bucket:** ✅ 체크 (공개 버킷으로 설정)
- **File size limit:** 2 MB
- **Allowed MIME types:** `image/*` (모든 이미지 타입 허용)
- **Create bucket** 클릭

### 3. Storage 정책 설정 (RLS)

**Storage** → **Policies** → **New policy** 클릭 후 아래 SQL 실행:

```sql
-- 모든 인증된 사용자가 아바타 업로드 가능
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- 모든 사용자가 아바타 읽기 가능 (공개)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 본인의 아바타만 업데이트 가능
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 본인의 아바타만 삭제 가능
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 2단계: 확인

### Storage 버킷 확인
1. Supabase Dashboard → Storage
2. `avatars` 버킷이 생성되었는지 확인
3. Public bucket 표시가 있는지 확인

### 정책 확인
1. Storage → Policies
2. 위에서 생성한 4개의 정책이 모두 활성화되어 있는지 확인

## 3단계: 앱에서 테스트

1. 앱 새로고침
2. 설정 탭 → 가족 구성원 → "수정" 클릭
3. 프로필 사진 업로드 버튼이 보이는지 확인
4. 이미지 파일 업로드 테스트

## 예상 결과
✅ 이미지 파일 선택 가능
✅ 업로드 후 즉시 미리보기 표시
✅ 저장 후 프로필 사진 변경 확인

## 지원되는 이미지 형식
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

## 파일 크기 제한
- 최대 2MB
- 권장 크기: 500x500px 이하

## 문제 해결

### "Policy violation" 에러 발생 시
→ Storage Policies가 제대로 설정되었는지 확인

### 이미지가 업로드되지 않는 경우
→ 파일 크기가 2MB 이하인지 확인
→ 이미지 파일 형식이 지원되는지 확인

### 업로드는 되지만 이미지가 보이지 않는 경우
→ 버킷이 Public으로 설정되었는지 확인
