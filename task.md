Задача для Copilot
Название проекта

mini-editor-architecture-lab

Цель

Создать учебный мини-редактор на React + TypeScript + Konva, который демонстрирует архитектурно правильное устройство современного онлайн-редактора.

Это не production-фича и не просто UI-демо.
Это лабораторный стенд, который должен показать правильное разделение между:

document/core state,
editor UI state,
transient interaction state,
renderer,
overlay layer,
command/action layer,
shell UI,
error isolation.

Проект должен быть маленьким, но сделанным по-взрослому.

Главная идея

Нужно реализовать простейший редактор одного прямоугольника, но так, чтобы архитектура сразу была:

чистой,
расширяемой,
устойчивой к ошибкам,
документированной,
пригодной как эталон для дальнейшего переноса идей в основной проект.
Технологический стек

Обязательный стек:

React
TypeScript
Konva или react-konva
Vite
Простая CSS/Tokens система без тяжёлого UI framework

Не использовать Redux Toolkit, Zustand и другие тяжёлые state-библиотеки на первом этапе, если без них можно сохранить ясность архитектуры.
Приоритет — понятная структура, а не “модно”.

Функциональный scope MVP

Реализовать минимальный редактор со следующими возможностями:

Объект

Один редактируемый прямоугольник:

x
y
width
height
fill
Canvas
отображение прямоугольника
выбор объекта
перемещение объекта мышью
изменение размера через corner handles
базовый zoom/pan можно добавить как optional, но не жертвовать архитектурой ради него
Overlay

Отдельный overlay layer:

selection outline
4 corner handles
optional label с координатами/размерами

Критично:

overlay должен быть отделён от document layer
handles должны быть screen-space sized
overlay не должен считаться частью документа
Inspector

Правая панель со свойствами:

X
Y
Width
Height
Fill

Изменения через inspector должны идти через те же commands/actions, что и изменения с холста.

Toolbar

Минимальный toolbar:

Select tool
Rectangle tool (может быть stub / future-ready)
Reset view / reset selection — опционально
Selection
один объект selected / not selected
selection синхронизируется между canvas и inspector
Interaction preview

Во время drag / resize:

не писать сразу в base document state на каждый пиксель
использовать transient preview state
commit в основной state только по завершении interaction
Undo/redo

Минимальная command history:

move
resize
inspector updates

Даже если реализация будет простой, она должна быть архитектурно выделена как отдельный слой.

Error isolation

Ошибка в canvas не должна валить весь app shell.
Нужен Error Boundary хотя бы вокруг canvas zone.

Архитектурные требования
1. Обязательное разделение state по уровням

Нужно явно разделить:

A. Document/Core State

Истина модели документа.

Пример:

rectangle geometry
rectangle visual props
B. Editor UI State

Состояние редактора, но не документа.

Пример:

selected object id
active tool
camera state
maybe hover target
C. Interaction / Transient State

Временное состояние активного взаимодействия.

Пример:

drag session
resize session
preview geometry
active handle

Нельзя смешивать эти уровни в одном объекте “state”.

2. Renderer должен быть отделён от core

Konva canvas должен быть только способом отрисовки.

Нельзя:

хранить документную истину только внутри Konva nodes
вычислять бизнес-смысл прямо внутри render callbacks
делать canvas главным владельцем данных

Нужно:

model-first architecture
renderer читает state и dispatch’ит commands/actions
3. Overlay layer обязан быть отдельным

Нужно явно разделить:

Document layer — прямоугольник
Overlay layer — selection outline, handles, labels

Overlay:

якорится на объект
позиционно следует за объектом
но visual size handles не зависит от масштаба документа
4. Commands / actions как единая точка изменений

И canvas, и inspector должны менять модель через единый action layer.

Например:

selectRect
startMoveRect
commitMoveRect
startResizeRect
commitResizeRect
updateRectProps

Не допускать прямых мутаций из разных мест.

5. Preview during interaction

Во время drag/resize:

строить preview geometry на основе base state + transient interaction state
не писать каждый mousemove в основную документную модель

Нужно показать архитектурно, что:

drag = preview
mouseup = commit
6. Error boundaries и отказоустойчивость

Нужно обернуть canvas zone в Error Boundary.

При ошибке в renderer:

toolbar должен выжить
inspector должен выжить
приложение должно показать fallback для canvas area

Добавить краткое описание:

какие ошибки ловит boundary
какие ошибки надо ловить локально в handlers
Требования к структуре проекта

Сделать проект с понятной структурой. Примерно так:

src/
  app/
    App.tsx
    AppShell.tsx
    providers/
  core/
    model/
    commands/
    selectors/
    types/
  editor/
    state/
    interactions/
    camera/
    selection/
  features/
    rectangle/
  ui/
    canvas/
      CanvasRoot.tsx
      DocumentLayer.tsx
      OverlayLayer.tsx
      handles/
    inspector/
    toolbar/
    panels/
  shared/
    utils/
    geometry/
    tokens/
    error-boundary/
  docs/

Можно предложить свою структуру, но она должна явно отражать архитектурные слои.

Требования к документации

Это критично.
Copilot не должен ограничиться кодом.

Нужно создать подробную документацию внутри проекта.

Обязательно создать:
1. README.md

Кратко объяснить:

что это за проект
зачем он сделан
что именно он демонстрирует
как запускать
что уже реализовано
что intentionally out of scope
2. docs/architecture.md

Подробно объяснить:

какие есть уровни state
как проходит поток данных
где core, где UI, где transient interaction
почему renderer отделён от модели
как реализован preview/commit pattern
как устроен command layer
как устроен overlay layer
почему это масштабируемо
3. docs/state-model.md

Описать:

типы состояния
кто владеет какими данными
что глобальное, что локальное
что persistent, что transient
4. docs/rendering-model.md

Описать:

document layer
overlay layer
coordinate flow
как вычисляются handles
как renderer получает данные
5. docs/interaction-model.md

Описать:

click
select
move
resize
preview
commit
cancel
inspector edits
6. docs/error-isolation.md

Описать:

где стоит Error Boundary
что происходит при падении canvas
почему shell выживает
7. docs/future-scaling.md

Описать:
как этот учебный проект можно масштабировать до:

нескольких объектов
tree panel
полноценного inspector
alternative renderer
второго canvas
domain-specific editor
Нормативные требования к качеству решения
Нельзя делать так:
один большой App.tsx на всё
смешение domain model и Konva nodes
прямые мутации объекта из canvas и inspector в обход общего action layer
смешение overlay и document geometry
запись base state на каждый mousemove без transient preview
отсутствие документации по архитектуре
Нужно сделать так:
маленькие, ясные модули
читаемые типы
однонаправленный поток данных
предсказуемые commands/actions
понятные boundaries между слоями
подробные комментарии только там, где реально нужна логика, а не банальности
UX требования

Даже несмотря на учебный характер проекта, UX должен быть аккуратным.

Нужно:
selected rectangle визуально очевиден
handles читаемы
drag и resize предсказуемы
inspector синхронизирован
toolbar не выглядит случайным
fallback при падении canvas читаемый
Не нужно:
делать “красивую игрушку”
перегружать интерфейс
добавлять много декоративного UI
Acceptance criteria

Проект считается выполненным, если:

Архитектура
document/core state отделён от editor UI state
transient interaction state выделен отдельно
renderer отделён от модели
overlay layer отделён от document layer
все изменения идут через единый action/command layer
Функциональность
прямоугольник можно выбрать
прямоугольник можно переместить
прямоугольник можно изменить по size через handles
свойства можно менять через inspector
drag/resize используют preview before commit
undo/redo работает хотя бы для базовых операций
Отказоустойчивость
canvas zone изолирована Error Boundary
падение canvas не убивает весь shell
Документация
есть README
есть docs по архитектуре
есть docs по state/rendering/interaction/error isolation
документация объясняет не только “что сделано”, но и “почему так”
Дополнительное желательное требование

Если получится без лишнего усложнения, сделать второй альтернативный renderer stub или хотя бы заготовку интерфейса под него.

Например:

общий core state
текущий Konva renderer
интерфейс/контракт для будущего альтернативного renderer

Не обязательно реализовывать второй renderer полностью, но архитектура должна явно показывать, что это возможно.

Формат результата

Нужен:

рабочий проект;
чистая структура файлов;
подробная документация;
краткий architectural summary в README;
список следующих шагов по развитию.
Финальная инструкция Copilot

Не делай “быстрый демо-код”.
Сделай маленький, но методологически правильный учебный проект, который можно использовать как эталон архитектуры редактора.

Приоритеты:

архитектурная ясность;
разделение слоёв;
predictability;
documentation-first thinking;
readiness for scaling.