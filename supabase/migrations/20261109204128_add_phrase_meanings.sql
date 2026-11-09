-- Optional editorial explanation, independent of quotation attribution.
alter table verble.phrases add column meaning text;
comment on column verble.phrases.meaning is 'Short, editorially reviewed explanation of the phrase.';
notify pgrst, 'reload schema';
