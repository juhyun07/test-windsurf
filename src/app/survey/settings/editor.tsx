'use client';

import { useState, useEffect } from 'react';
import { Question, MultipleChoiceOption, SideBySideOption, SurveyEditorState, SurveyEditorProps, QuestionType, MultipleChoiceQuestionProps, SideBySideQuestionProps, TextEntryQuestionProps } from './types';
import type { JSX } from 'react';
import { CounterInput } from './components/CounterInput';

// 상수 정의
const COLUMN_COUNT_RANGE = { min: 2, max: 4 };
const OPTION_COUNT_RANGE = { min: 1, max: 5 };

// 입력 필드의 border 스타일을 관리하는 유틸리티 함수
const getInputBorderClass = (previewMode: boolean) => {
  return 'border-blue-500';
};

export default function SurveyEditor({ onSave }: SurveyEditorProps): JSX.Element {
  // 컴포넌트 상태 관리
  const [state, setState] = useState<SurveyEditorState>({
    questions: [],
    selectedQuestionId: undefined,
    previewMode: false
  });

  // 선택된 질문이 없을 때 자동으로 첫 번째 질문 선택
  useEffect(() => {
    if (state.questions.length > 0 && !state.selectedQuestionId) {
      setState(prev => ({
        ...prev,
        selectedQuestionId: state.questions[0].id
      }));
    }
  }, [state.questions]);

  // 초기 로드 시 복수 선택 항목 자동 추가
  useEffect(() => {
    if (state.questions.length === 0) {
      addQuestion(QuestionType.MULTIPLE_CHOICE);
    }
  }, []);

  // 미리보기 모달 상태 관리
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // 새로운 질문 추가 함수
  const addQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      id: `q${Date.now()}`,
      type,
      text: '',
      required: false,
      exportTag: '',
      props: (() => {
        switch (type) {
          case QuestionType.MULTIPLE_CHOICE:
            return {
              options: [{ id: `opt${Date.now()}`, text: '' }],
              optionCount: 1
            } as MultipleChoiceQuestionProps;
          case QuestionType.SIDE_BY_SIDE:
            return {
              sideBySideOptions: [{ 
                id: `opt${Date.now()}`, 
                text: '', 
                columns: [{
                  title: '열 1',
                  answers: ['']
                }, {
                  title: '열 2',
                  answers: ['']
                }]
              }],
              optionCount: 2,
              columnCount: 2
            } as SideBySideQuestionProps;
          case QuestionType.TEXT_ENTRY:
            return {
              maxLength: 100,
              placeholder: '답변을 입력하세요'
            } as TextEntryQuestionProps;
          default:
            throw new Error(`Unknown question type: ${type}`);
        }
      })()
    };
    setState(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
    setState(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
      selectedQuestionId: newQuestion.id
    }));
  };

  // 질문 텍스트 업데이트 함수
  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setState(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId ? { ...q, ...updates } : q
      )
    }));
  };

  // 복수선택 항목 수 업데이트 함수
  const updateOptionCount = (questionId: string, count: number) => {
    const currentQuestion = state.questions.find(q => q.id === questionId);
    if (!currentQuestion || currentQuestion.type !== QuestionType.MULTIPLE_CHOICE) return;

    const existingOptions = currentQuestion.options || [];
    const newOptions = Array.from({ length: Math.max(1, Math.min(5, count)) }, (_, i) => {
      const existingOption = existingOptions[i];
      return {
        id: `opt${questionId}_${i}`,
        text: existingOption?.text || ''
      };
    });

    // 타입 안전하게 업데이트
    const newQuestions = state.questions.map(q =>
      q.id === questionId 
        ? { 
            ...q, 
            optionCount: Math.max(1, Math.min(5, count)),
            options: newOptions,
            props: { ...q.props, optionCount: Math.max(1, Math.min(5, count)) }
          } 
        : q
    );

    setState({ ...state, questions: newQuestions });
  };

  const updateRowCount = (questionId: string, newOptionCount: number) => {
    const newQuestions = [...state.questions];
    const questionIndex = newQuestions.findIndex(q => q.id === questionId);
    if (questionIndex !== -1) {
      const currentProps = newQuestions[questionIndex].props as SideBySideQuestionProps;
      newQuestions[questionIndex] = {
        ...newQuestions[questionIndex],
        props: {
          ...currentProps,
          optionCount: newOptionCount,
          columnCount: currentProps.columnCount,
          sideBySideOptions: Array.from({ length: newOptionCount }, (_, i) => ({
            id: `${questionId}-option-${i}`,
            text: currentProps.sideBySideOptions?.[i]?.text || '',
            descriptionCount: currentProps.sideBySideOptions?.[i]?.descriptionCount || 1,
            columns: Array.from({ length: currentProps.columnCount }, (_, j) => ({
              title: currentProps.sideBySideOptions?.[i]?.columns?.[j]?.title || `열 ${j + 1} 제목`,
              answers: currentProps.sideBySideOptions?.[i]?.columns?.[j]?.answers || ['']
            }))
          }))
        }
      };
      setState(prev => ({ ...prev, questions: newQuestions }));
    }
  };

  const updateDescriptionCount = (questionId: string, optionIndex: number, newDescriptionCount: number) => {
    const questionIndex = state.questions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) return;

    const newQuestions = [...state.questions];
    const currentProps = newQuestions[questionIndex].props as SideBySideQuestionProps;

    newQuestions[questionIndex] = {
      ...newQuestions[questionIndex],
      props: {
        ...currentProps,
        sideBySideOptions: currentProps.sideBySideOptions?.map((opt, idx) => {
          if (idx === optionIndex) {
            return {
              ...opt,
              descriptionCount: newDescriptionCount
            };
          }
          return opt;
        }) || []
      }
    };
    setState(prev => ({ ...prev, questions: newQuestions }));
  };

  const updateColumnCount = (questionId: string, newColumnCount: number) => {
    const newQuestions = [...state.questions];
    const questionIndex = newQuestions.findIndex(q => q.id === questionId);
    if (questionIndex !== -1) {
      const currentProps = newQuestions[questionIndex].props as SideBySideQuestionProps;
      newQuestions[questionIndex] = {
        ...newQuestions[questionIndex],
        props: {
          ...currentProps,
          columnCount: newColumnCount,
          sideBySideOptions: currentProps.sideBySideOptions?.map(opt => ({
            ...opt,
            columns: Array.from({ length: newColumnCount }, (_, i) => opt.columns?.[i] || '')
          }))
        }
      };
      setState(prev => ({ ...prev, questions: newQuestions }));
    }
  };

  // 선택항목 텍스트 업데이트 함수
  const updateOption = (questionId: string, optionId: string, text: string) => {
    setState(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? {
          ...q,
          props: (() => {
            switch (q.type) {
              case QuestionType.MULTIPLE_CHOICE:
                return {
                  ...q.props,
                  options: (q.props as MultipleChoiceQuestionProps).options?.map(opt => 
                    opt.id === optionId ? { ...opt, text } : opt
                  )
                } as MultipleChoiceQuestionProps;
              default:
                return q.props;
            }
          })()
        } : q
      ),
    }));
  };

  // 병렬 비교 옵션 업데이트 함수
  const updateSideBySideOption = (questionId: string, optionIndex: number, updates: Partial<SideBySideOption>) => {
    const newQuestions = [...state.questions];
    const questionIndex = newQuestions.findIndex(q => q.id === questionId);
    if (questionIndex !== -1) {
      const currentProps = newQuestions[questionIndex].props as SideBySideQuestionProps;
      const currentOptions = currentProps.sideBySideOptions || [];
      const updatedOption = {
        id: currentOptions[optionIndex]?.id || crypto.randomUUID(),
        text: updates.text || currentOptions[optionIndex]?.text || '',
        descriptionCount: updates.descriptionCount || currentOptions[optionIndex]?.descriptionCount || 1,
        columns: updates.columns || currentOptions[optionIndex]?.columns || Array.from({ length: (currentProps as SideBySideQuestionProps).columnCount }, (_, i) => ({
          title: `열 ${i + 1} 제목`,
          answers: ['']
        }))
      };
      newQuestions[questionIndex] = {
        ...newQuestions[questionIndex],
        props: {
          ...currentProps,
          sideBySideOptions: currentOptions.map((opt, i) => 
            i === optionIndex ? updatedOption : opt
          )
        }
      };
      setState(prev => ({ ...prev, questions: newQuestions }));
    }
  };

  // 미리보기 모달 열기 함수
  const togglePreview = () => {
    setIsPreviewModalOpen(true);
  };

  // 설문 저장 함수
  const handleSave = () => {
    if (onSave) {
      onSave(state.questions);
    }
  };

  const currentQuestion = state.questions.find(q => q.id === state.selectedQuestionId);
  const showSideBySideLayer = currentQuestion?.type === QuestionType.SIDE_BY_SIDE;

  return (
    <div className="flex h-screen">
      {/* 왼쪽 패널 */}
      <div className="w-1/6 p-4 border-r px-5">
        <div className="mb-4">
          <label className="block mb-2">질문 유형</label>
          <select
            value={currentQuestion?.type || QuestionType.MULTIPLE_CHOICE}
            onChange={(e) => {
              const newType = e.target.value as QuestionType;
              addQuestion(newType);
            }}
            className="w-full border border-gray-300 rounded px-2 py-1"
          >
            <option value={QuestionType.MULTIPLE_CHOICE}>복수 선택</option>
            <option value={QuestionType.SIDE_BY_SIDE}>병렬 비교</option>
            <option value={QuestionType.TEXT_ENTRY}>텍스트 엔트리</option>
          </select>
        </div>

         {/* 선택항목 수 (복수 선택 항목에서만 표시) */}
         {currentQuestion?.type === QuestionType.MULTIPLE_CHOICE && (
          <div className="mb-4">
            <label className="block mb-2">옵션 수</label>
            <div className="flex items-center">
              <button
                onClick={() => updateOptionCount(state.selectedQuestionId!, (currentQuestion?.props as MultipleChoiceQuestionProps).optionCount - 1)}
                className="bg-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-300"
              >
                -
              </button>
              <input
                type="text"
                className="w-12 text-center mx-2 border border-gray-300 rounded"
                value={(currentQuestion?.props as MultipleChoiceQuestionProps).optionCount || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  const numValue = parseInt(value);
                  if (!isNaN(numValue) || value === '') {
                    updateOptionCount(state.selectedQuestionId!, Math.max(1, Math.min(5, numValue)));
                  }
                }}
                onBlur={(e) => {
                  const value = e.currentTarget.value;
                  if (value === '') {
                    updateOptionCount(state.selectedQuestionId!, 1);
                  }
                }}
              />
              <button
                onClick={() => updateOptionCount(state.selectedQuestionId!, (currentQuestion?.props as MultipleChoiceQuestionProps).optionCount + 1)}
                className="bg-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-300"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* 병렬 비교 질문의 편집 영역 */}
        {currentQuestion?.type === QuestionType.SIDE_BY_SIDE && (
          <div className="space-y-4">
            <CounterInput
              value={(currentQuestion?.props as SideBySideQuestionProps).columnCount}
              minValue={2}
              maxValue={4}
              onChange={(value) => updateColumnCount(state.selectedQuestionId!, value)}
              label="열 수"
            />

            <CounterInput
              value={(currentQuestion?.props as SideBySideQuestionProps).sideBySideOptions?.[0]?.descriptionCount || 1}
              minValue={1}
              maxValue={4}
              onChange={(value) => {
                const currentOption = (currentQuestion?.props as SideBySideQuestionProps).sideBySideOptions?.[0];
                if (currentOption) {
                  updateDescriptionCount(state.selectedQuestionId!, 0, value);
                }
              }}
              label="서술 수"
            />
          </div>
        )}

        {/* 질문 편집 영역 */}
        <div className="space-y-4">
          {currentQuestion?.type === QuestionType.TEXT_ENTRY && (
            <div className="space-y-2">
              <div>
                <label className="block mb-2">최대 길이</label>
                <input
                  type="number"
                  value={(currentQuestion?.props as TextEntryQuestionProps).maxLength}
                  onChange={(e) => updateQuestion(state.selectedQuestionId!, { props: { maxLength: parseInt(e.target.value) } })}
                  className="w-full border border-gray-300 rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="block mb-2">플레이스홀더</label>
                <input
                  type="text"
                  value={(currentQuestion?.props as TextEntryQuestionProps).placeholder}
                  onChange={(e) => updateQuestion(state.selectedQuestionId!, { props: { placeholder: e.target.value } })}
                  className="w-full border border-gray-300 rounded px-2 py-1"
                />
              </div>
            </div>
          )}

        </div>
      </div>
      
      {/* 오른쪽 패널 */}
      <div className="flex-1 p-4 pl-6">
        {state.questions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">질문을 추가해주세요.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex justify-end gap-1">
              <button
                onClick={togglePreview}
                className="bg-white text-blue-500 border-blue-500 border-2 px-2 py-1 rounded hover:bg-blue-50 hover:border-blue-600 transition-colors"
              >
                미리보기
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
              >
                저장하기
              </button>
            </div>

            <div className="flex-1">
              <div className="space-y-1">
                <div className="flex flex-col gap-1">
                  <div>
                    <input
                      type="text"
                      className={`w-20 p-2 ${getInputBorderClass(false)}`}
                      placeholder="Q1"
                      value={state.questions.find(q => q.id === state.selectedQuestionId)?.exportTag || ''}
                      onChange={(e) => updateQuestion(state.selectedQuestionId!, { exportTag: e.target.value })}
                    />
                  </div>
                  <div className="mb-1">
                    <input
                      type="text"
                      className={`w-full p-2 ${getInputBorderClass(false)}`}
                      placeholder="질문을 적어주세요."
                      value={state.questions.find(q => q.id === state.selectedQuestionId)?.text || ''}
                      onChange={(e) => updateQuestion(state.selectedQuestionId!, { text: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {currentQuestion?.type === QuestionType.MULTIPLE_CHOICE ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {Array.from({ length: (currentQuestion?.props as MultipleChoiceQuestionProps).optionCount }).map((_, index) => (
                      <div key={index} className="flex items-center p-1">
                        <input
                          type="radio"
                          name={`question_${state.selectedQuestionId}`}
                          className="mr-2"
                        />
                        <input
                          type="text"
                          className={`flex-1 ${getInputBorderClass(false)}`}
                          placeholder="선택항목을 작성해주세요."
                          value={(currentQuestion?.props as MultipleChoiceQuestionProps).options?.[index]?.text}
                          onChange={(e) => updateOption(state.selectedQuestionId!, (currentQuestion?.props as MultipleChoiceQuestionProps).options?.[index]?.id, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : currentQuestion?.type === QuestionType.TEXT_ENTRY ? (
                <div className="mt-1">
                  <textarea
                    rows={4}
                    maxLength={(currentQuestion?.props as TextEntryQuestionProps).maxLength || 100}
                    className={`w-full p-2 ${getInputBorderClass(false)} border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none`}
                    placeholder={(currentQuestion?.props as TextEntryQuestionProps).placeholder || "답변을 입력해주세요."}
                  />
                </div>
              ) : currentQuestion?.type === QuestionType.SIDE_BY_SIDE ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <table className="w-full border-collapse mx-auto">
                      <thead>
                        <tr>
                          <th className="w-1/4 border p-2">서술</th>
                          <th className="w-3/4 border p-2">열 선택</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(currentQuestion?.props as SideBySideQuestionProps).sideBySideOptions?.map((opt, optIndex) => (
                          <tr key={opt.id} className="border-b">
                            <td className="p-2">
                              <input
                                type="text"
                                className={`w-full ${getInputBorderClass(false)}`}
                                placeholder="서술을 작성해주세요."
                                value={opt.text}
                                onChange={(e) => updateSideBySideOption(state.selectedQuestionId!, optIndex, { text: e.target.value })}
                              />
                            </td>
                            <td className="p-2">
                              <div className="flex justify-center gap-3">
                                {opt.columns.map((column: SideBySideOption['columns'][number], columnIndex: number) => (
                                    <div key={columnIndex} className="border border-gray-300 rounded p-2">
                                      <div className="flex justify-between mb-2">
                                        <button
                                          onClick={() => {
                                            const newColumns = [...opt.columns];
                                            newColumns[columnIndex] = {
                                              ...column,
                                              answers: [...(column.answers || []), '']
                                            };
                                            updateSideBySideOption(state.selectedQuestionId!, optIndex, { columns: newColumns });
                                          }}
                                          className="text-sm text-blue-500 hover:text-blue-700"
                                        >
                                          열 답 추가
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (column.answers?.length > 1) {
                                              const newColumns = [...opt.columns];
                                              newColumns[columnIndex] = {
                                                ...column,
                                                answers: column.answers?.slice(0, -1) || []
                                              };
                                              updateSideBySideOption(state.selectedQuestionId!, optIndex, { columns: newColumns });
                                            }
                                          }}
                                          className="text-sm text-red-500 hover:text-red-700"
                                        >
                                          열 답 제거
                                        </button>
                                      </div>
                                      <div className="mb-2">
                                        <input
                                          type="text"
                                          className={`w-full ${getInputBorderClass(false)} text-center`}
                                          placeholder={`열 ${columnIndex + 1} 제목`}
                                          value={column.title}
                                          onChange={(e) => {
                                            const newColumns = [...opt.columns];
                                            newColumns[columnIndex] = {
                                              ...column,
                                              title: e.target.value
                                            };
                                            updateSideBySideOption(state.selectedQuestionId!, optIndex, { columns: newColumns });
                                          }}
                                        />
                                      </div>
                                      <div className="flex flex-wrap justify-center gap-2">
                                        {(column.answers || []).map((answer: string, answerIndex: number) => (
                                          <div key={answerIndex} className="flex flex-col w-12">
                                            <input
                                              type="text"
                                              className={`w-full ${getInputBorderClass(false)} text-center`}
                                              placeholder={`답 ${answerIndex + 1}`}
                                              value={answer}
                                              onChange={(e) => {
                                                const newColumns = [...opt.columns];
                                                const newAnswers = [...(column.answers || [])];
                                                newAnswers[answerIndex] = e.target.value;
                                                newColumns[columnIndex] = {
                                                  ...column,
                                                  answers: newAnswers
                                                };
                                                updateSideBySideOption(state.selectedQuestionId!, optIndex, { columns: newColumns });
                                              }}
                                            />
                                            <div className="flex justify-center mt-1">
                                              <input
                                                type="radio"
                                                name={`RG_QID8_${optIndex}_${columnIndex}`}
                                                className="mr-2"
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* 미리보기 모달 */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">설문조사 미리보기</h2>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                X
              </button>
            </div>

            <div className="space-y-6">
              {state.selectedQuestionId ? (
                state.questions
                  .filter(q => q.id === state.selectedQuestionId)
                  .map((q) => (
                    <div key={q.id} className="border-b pb-6 last:border-0">
                      <div className="font-semibold mb-4">{q.text}</div>
                      {q.type === QuestionType.MULTIPLE_CHOICE ? (
                        <div className="space-y-3">
                          {q.props && (q.props as MultipleChoiceQuestionProps).options?.map((opt) => (
                            <label key={opt.id} className="flex items-center">
                              <input
                                type="radio"
                                name={`preview_${q.id}`}
                                className="mr-3"
                              />
                              <span className="text-gray-700">{opt.text}</span>
                            </label>
                          ))}
                        </div>
                      ) : q.type === QuestionType.TEXT_ENTRY ? (
                        <div className="mt-4">
                          <input
                            type="text"
                            className="w-full p-3 border rounded-lg"
                            placeholder="답변을 입력해주세요."
                          />
                        </div>
                      ) : q.type === QuestionType.SIDE_BY_SIDE ? (
                        <div className="space-y-4">
                          {q.props && (q.props as SideBySideQuestionProps).sideBySideOptions?.map((opt, optIndex) => (
                            <div key={opt.id} className="space-y-3">
                              <div className="font-semibold mb-2">{opt.text}</div>
                              <div className="overflow-x-auto">
                                <table className="min-w-full">
                                  <thead>
                                    <tr>
                                      <th className="border-r border-gray-300">서술</th>
                                      {opt.columns?.map((column, columnIndex) => (
                                        <th key={columnIndex} className="border-r border-gray-300">
                                          {column.title}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td className="border-r border-gray-300">
                                        <div className="flex flex-col gap-2">
                                          {Array.from({ length: opt.descriptionCount || 0 }).map((_, rowIndex) => (
                                            <div key={rowIndex} className="flex items-center">
                                              <input
                                                type="radio"
                                                name={`preview_${q.id}_${optIndex}`}
                                                className="mr-2"
                                              />
                                              <span>서술 {rowIndex + 1}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </td>
                                      {opt.columns?.map((column, columnIndex) => (
                                        <td key={columnIndex} className="border-r border-gray-300">
                                          <div className="flex flex-col gap-2">
                                            {column.answers?.map((answer, answerIndex) => (
                                              <div key={answerIndex} className="flex justify-center">
                                                <input
                                                  type="radio"
                                                  name={`preview_${q.id}_${optIndex}_${columnIndex}_${answerIndex}`}
                                                  className="mr-2"
                                                />
                                                <span className="text-gray-700">{answer}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </td>
                                      ))}
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">질문을 선택해주세요.</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
