-- 기존 auth.users에 있는 사용자들을 users 테이블에 추가
-- (handle_new_user 트리거가 실행되지 않았을 경우를 위한 수동 마이그레이션)

INSERT INTO public.users (id, email, name, role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
  'Viewer' as role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- 결과 확인
SELECT * FROM public.users;
